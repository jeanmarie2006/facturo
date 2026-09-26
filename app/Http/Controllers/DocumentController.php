<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\Entreprise;
use App\Services\Format;
use App\Services\Outbox;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DocumentController extends Controller
{
    private function ent(Request $request): Entreprise
    {
        return $request->user()->entreprise;
    }

    private function find(Request $request, int $id): Document
    {
        return $this->ent($request)->documents()->with('client', 'lignes')->findOrFail($id);
    }

    private function rules(Entreprise $e): array
    {
        return [
            'client_id' => ['required', 'integer', "exists:clients,id,entreprise_id,{$e->id}"],
            'type' => ['required', 'in:devis,facture'],
            'date_emission' => ['required', 'date'],
            'date_echeance' => ['nullable', 'date', 'after_or_equal:date_emission'],
            'devise' => ['required', 'in:XOF,EUR,USD'],
            'taux_tva' => ['required', 'numeric', 'between:0,30'],
            'notes' => ['nullable', 'string', 'max:400'],
            'lignes' => ['required', 'array', 'min:1', 'max:60'],
            'lignes.*.designation' => ['required', 'string', 'max:200'],
            'lignes.*.quantite' => ['required', 'numeric', 'gt:0', 'max:1000000'],
            'lignes.*.prix_unitaire' => ['required', 'numeric', 'min:0', 'max:1000000000'],
        ];
    }

    public function index(Request $request): JsonResponse
    {
        $request->validate(['type' => 'nullable|in:devis,facture', 'statut' => 'nullable|string|max:12', 'q' => 'nullable|string|max:80']);
        $q = $this->ent($request)->documents()->with('client:id,nom')->latest('date_emission')->latest('id');
        $q->when($request->query('type'), fn ($w, $v) => $w->where('type', $v));
        match ($request->query('statut')) {
            null, '' => null,
            'en_retard' => $q->enRetard(),
            'envoyee' => $q->where('statut', 'envoyee')->where(fn ($w) => $w->where('type', 'devis')->orWhereDate('date_echeance', '>=', now()->toDateString())),
            default => $q->where('statut', $request->query('statut')),
        };
        if ($t = trim((string) $request->query('q'))) {
            $like = '%'.str_replace(['%', '_'], ['\%', '\_'], $t).'%';
            $q->where(fn ($w) => $w->where('numero', 'like', $like)->orWhereHas('client', fn ($c) => $c->where('nom', 'like', $like)));
        }

        return response()->json($q->paginate(15));
    }

    public function store(Request $request): JsonResponse
    {
        $e = $this->ent($request);
        $data = $request->validate($this->rules($e));
        if ($e->limite_mensuelle !== null && $e->documents()->whereYear('created_at', now()->year)->whereMonth('created_at', now()->month)->count() >= $e->limite_mensuelle) {
            return response()->json(['message' => "Le plan gratuit est limité à {$e->limite_mensuelle} documents par mois. Passez au plan Pro pour un usage illimité.", 'code' => 'plan_limite'], 422);
        }
        $doc = DB::transaction(function () use ($e, $data) {
            $doc = $e->documents()->create([
                'client_id' => $data['client_id'], 'type' => $data['type'], 'numero' => $e->prochainNumero($data['type']), 'date_emission' => $data['date_emission'],
                'date_echeance' => $data['date_echeance'] ?? \Carbon\Carbon::parse($data['date_emission'])->addDays($e->delai_paiement)->toDateString(),
                'devise' => $data['devise'], 'taux_tva' => $data['taux_tva'], 'notes' => isset($data['notes']) ? strip_tags($data['notes']) : null, 'token' => Str::random(32),
            ]);
            $this->lignes($doc, $data['lignes']);

            return $doc;
        });

        return response()->json($doc->fresh(['client', 'lignes']), 201);
    }

    private function lignes(Document $doc, array $lignes): void
    {
        $doc->lignes()->delete();
        foreach (array_values($lignes) as $i => $l) {
            $doc->lignes()->create(['designation' => strip_tags($l['designation']), 'quantite' => $l['quantite'], 'prix_unitaire' => $l['prix_unitaire'], 'ordre' => $i]);
        }
        $doc->unsetRelation('lignes');
        $doc->recalculer();
    }

    public function show(Request $request, int $id): JsonResponse
    {
        return response()->json($this->find($request, $id)->load('entreprise'));
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $doc = $this->find($request, $id);
        abort_unless($doc->statut === 'brouillon', 422, 'Seul un brouillon peut être modifié.');
        $data = $request->validate($this->rules($this->ent($request)));
        DB::transaction(function () use ($doc, $data) {
            $doc->update(['client_id' => $data['client_id'], 'date_emission' => $data['date_emission'], 'date_echeance' => $data['date_echeance'] ?? $doc->date_echeance, 'devise' => $data['devise'], 'taux_tva' => $data['taux_tva'], 'notes' => isset($data['notes']) ? strip_tags($data['notes']) : null]);
            $this->lignes($doc, $data['lignes']);
        });

        return response()->json($doc->fresh()->load('client', 'lignes'));
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $doc = $this->find($request, $id);
        abort_unless($doc->statut === 'brouillon', 422, 'Seul un brouillon peut être supprimé.');
        $doc->delete();

        return response()->json(['message' => 'Brouillon supprimé.']);
    }

    /** Envoi au client par e-mail (simulé) : le brouillon passe en « envoyé ». */
    public function envoyer(Request $request, int $id): JsonResponse
    {
        $doc = $this->find($request, $id);
        abort_unless(in_array($doc->statut, ['brouillon', 'envoyee'], true), 422, 'Ce document ne peut plus être envoyé.');
        abort_if($doc->lignes->isEmpty() || $doc->total_ttc <= 0, 422, 'Le document est vide.');
        $doc->update(['statut' => 'envoyee']);
        $mail = Outbox::envoyer($doc);

        return response()->json(['document' => $doc->fresh()->load('client', 'lignes'), 'email' => $mail]);
    }

    /** Enregistrement manuel d'un paiement reçu. */
    public function payer(Request $request, int $id): JsonResponse
    {
        $doc = $this->find($request, $id);
        abort_unless($doc->type === 'facture' && in_array($doc->statut, ['envoyee', 'brouillon'], true), 422, 'Cette facture ne peut pas être marquée payée.');
        $d = $request->validate(['mode' => ['required', 'in:virement,especes,cheque,momo,moov'], 'date' => ['nullable', 'date']]);
        $doc->update(['statut' => 'payee', 'payee_le' => $d['date'] ?? now()->toDateString(), 'paiement_mode' => $d['mode'], 'paiement_ref' => strtoupper(Str::random(8))]);
        Outbox::envoyer($doc->fresh(), 'recu');

        return response()->json($doc->fresh()->load('client', 'lignes'));
    }

    public function decision(Request $request, int $id): JsonResponse
    {
        $doc = $this->find($request, $id);
        abort_unless($doc->type === 'devis' && $doc->statut === 'envoyee', 422, 'Seul un devis envoyé peut être accepté ou refusé.');
        $doc->update(['statut' => $request->validate(['statut' => ['required', 'in:acceptee,refusee']])['statut']]);

        return response()->json($doc->fresh()->load('client', 'lignes'));
    }

    public function convertir(Request $request, int $id): JsonResponse
    {
        $devis = $this->find($request, $id);
        abort_unless($devis->type === 'devis', 422, 'Seul un devis peut être converti en facture.');
        abort_if(Document::where('devis_id', $devis->id)->exists(), 422, 'Ce devis a déjà été converti en facture.');
        $e = $this->ent($request);
        if ($e->limite_mensuelle !== null && $e->documents()->whereYear('created_at', now()->year)->whereMonth('created_at', now()->month)->count() >= $e->limite_mensuelle) {
            return response()->json(['message' => "Le plan gratuit est limité à {$e->limite_mensuelle} documents par mois.", 'code' => 'plan_limite'], 422);
        }
        $f = DB::transaction(function () use ($devis, $e) {
            $f = $e->documents()->create([
                'client_id' => $devis->client_id, 'type' => 'facture', 'numero' => $e->prochainNumero('facture'), 'date_emission' => now()->toDateString(),
                'date_echeance' => now()->addDays($e->delai_paiement)->toDateString(), 'devise' => $devis->devise, 'taux_tva' => $devis->taux_tva, 'notes' => $devis->notes, 'devis_id' => $devis->id, 'token' => Str::random(32),
            ]);
            $this->lignes($f, $devis->lignes->map(fn ($l) => $l->only(['designation', 'quantite', 'prix_unitaire']))->all());
            $devis->update(['statut' => 'acceptee']);

            return $f;
        });

        return response()->json($f->fresh(['client', 'lignes']), 201);
    }

    public function relancer(Request $request, int $id): JsonResponse
    {
        $doc = $this->find($request, $id);
        abort_unless($doc->type === 'facture' && $doc->statut === 'envoyee', 422, 'Seule une facture envoyée et impayée peut être relancée.');
        $doc->update(['derniere_relance' => now()->toDateString()]);

        return response()->json(Outbox::envoyer($doc->fresh(), 'relance'));
    }

    /** Relance en un clic toutes les factures en retard (sauf relancées depuis moins de 7 jours). */
    public function relancerTout(Request $request): JsonResponse
    {
        return response()->json(['relances' => self::relancesAutomatiques($this->ent($request))]);
    }

    public static function relancesAutomatiques(?Entreprise $e = null): int
    {
        $n = 0;
        $q = Document::enRetard()->with('client', 'entreprise')->where(fn ($w) => $w->whereNull('derniere_relance')->orWhereDate('derniere_relance', '<=', now()->subDays(7)->toDateString()));
        if ($e) {
            $q->where('entreprise_id', $e->id);
        }
        foreach ($q->get() as $d) {
            $d->update(['derniere_relance' => now()->toDateString()]);
            Outbox::envoyer($d->fresh(['client', 'entreprise']), 'relance');
            $n++;
        }

        return $n;
    }

    public function pdf(Request $request, int $id)
    {
        $doc = $this->find($request, $id)->load('entreprise');

        return self::rendrePdf($doc);
    }

    public static function rendrePdf(Document $doc)
    {
        return Pdf::loadView('pdf.document', ['d' => $doc, 'fmt' => fn ($n) => Format::montant((float) $n, $doc->devise)])->setPaper('a4')->stream($doc->numero.'.pdf');
    }

    /** Export comptable CSV (compatible Excel). */
    public function csv(Request $request)
    {
        $request->validate(['from' => 'nullable|date', 'to' => 'nullable|date']);
        $q = $this->ent($request)->documents()->with('client:id,nom')->where('type', 'facture')->whereIn('statut', ['envoyee', 'payee'])->orderBy('date_emission');
        $q->when($request->query('from'), fn ($w, $v) => $w->whereDate('date_emission', '>=', $v))->when($request->query('to'), fn ($w, $v) => $w->whereDate('date_emission', '<=', $v));

        return response()->streamDownload(function () use ($q) {
            $f = fopen('php://output', 'w');
            fwrite($f, "\xEF\xBB\xBF");
            fputcsv($f, ['Numéro', 'Date', 'Échéance', 'Client', 'Devise', 'Total HT', 'TVA', 'Total TTC', 'Statut', 'Date de paiement', 'Mode de paiement'], ';');
            foreach ($q->get() as $d) {
                fputcsv($f, [$d->numero, $d->date_emission->format('d/m/Y'), $d->date_echeance->format('d/m/Y'), $d->client->nom, $d->devise, $d->total_ht, $d->total_tva, $d->total_ttc, $d->statut_effectif, $d->payee_le?->format('d/m/Y'), $d->paiement_mode], ';');
            }
            fclose($f);
        }, 'export-factures-'.now()->format('Ymd').'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
