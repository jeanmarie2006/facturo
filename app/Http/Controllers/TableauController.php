<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Services\Outbox;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TableauController extends Controller
{
    /** Tableau de bord : chiffre d'affaires du mois, factures en attente, retards, évolution. */
    public function __invoke(Request $request): JsonResponse
    {
        $e = $request->user()->entreprise;
        $d = $e->devise;
        $base = fn () => $e->documents()->where('type', 'facture')->where('devise', $d);
        $payees = $base()->where('statut', 'payee');
        $mois = (clone $payees)->whereYear('payee_le', now()->year)->whereMonth('payee_le', now()->month);
        $attente = $base()->where('statut', 'envoyee')->whereDate('date_echeance', '>=', now()->toDateString());
        $retard = $base()->enRetard();

        $serie = collect(range(5, 0))->map(function ($i) use ($payees) {
            $m = now()->startOfMonth()->subMonths($i);
            $v = (clone $payees)->whereYear('payee_le', $m->year)->whereMonth('payee_le', $m->month)->sum('total_ttc');

            return ['mois' => $m->format('Y-m'), 'total' => (float) $v];
        });
        $top = $base()->where('statut', 'payee')->select('client_id', DB::raw('sum(total_ttc) as total'), DB::raw('count(*) as factures'))->groupBy('client_id')->orderByDesc('total')->limit(5)->with('client:id,nom')->get()
            ->map(fn ($r) => ['client' => $r->client->nom ?? '—', 'total' => (float) $r->total, 'factures' => (int) $r->factures]);

        return response()->json([
            'devise' => $d,
            'ca_mois' => (float) $mois->sum('total_ttc'), 'nb_payees_mois' => (clone $mois)->count(),
            'en_attente' => (float) (clone $attente)->sum('total_ttc'), 'nb_attente' => (clone $attente)->count(),
            'en_retard' => (float) (clone $retard)->sum('total_ttc'), 'nb_retard' => (clone $retard)->count(),
            'devis_ouverts' => $e->documents()->where('type', 'devis')->where('statut', 'envoyee')->count(),
            'brouillons' => $e->documents()->where('statut', 'brouillon')->count(),
            'evolution' => $serie, 'top_clients' => $top,
            'recents' => $e->documents()->with('client:id,nom')->latest('id')->limit(6)->get(),
            'usage' => ['documents_ce_mois' => $e->documents()->whereYear('created_at', now()->year)->whereMonth('created_at', now()->month)->count(), 'limite' => $e->limite_mensuelle],
        ]);
    }

    // ---- Page publique de paiement (lien envoyé au client)
    public function publique(string $token): JsonResponse
    {
        $d = Document::with('client:id,nom', 'lignes', 'entreprise:id,nom,adresse,telephone,email,ifu,mentions')->where('token', $token)->firstOrFail();
        abort_if($d->statut === 'brouillon', 404);

        return response()->json($d->makeHidden(['token', 'entreprise_id', 'client_id']));
    }

    public function payerEnLigne(Request $request, string $token): JsonResponse
    {
        $d = Document::with('client', 'entreprise')->where('token', $token)->firstOrFail();
        abort_unless($d->type === 'facture' && $d->statut === 'envoyee', 422, 'Cette facture ne peut pas être payée en ligne.');
        $data = $request->validate(['mode' => ['required', 'in:momo,moov'], 'numero' => ['required', 'regex:/^\+?[0-9 .\-]{8,20}$/']], ['numero.regex' => 'Numéro Mobile Money invalide.']);
        $ref = strtoupper(($data['mode'] === 'momo' ? 'MOMO-' : 'MOOV-').Str::random(8));
        $d->update(['statut' => 'payee', 'payee_le' => now()->toDateString(), 'paiement_mode' => $data['mode'], 'paiement_ref' => $ref]);
        Outbox::envoyer($d->fresh(['client', 'entreprise']), 'recu');

        return response()->json(['message' => 'Paiement reçu. Merci !', 'reference' => $ref]);
    }

    public function pdfPublic(string $token)
    {
        $d = Document::with('client', 'lignes', 'entreprise')->where('token', $token)->firstOrFail();
        abort_if($d->statut === 'brouillon', 404);

        return DocumentController::rendrePdf($d);
    }
}
