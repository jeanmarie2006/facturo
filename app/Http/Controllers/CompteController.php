<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Email;
use App\Models\Entreprise;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/** Profil de l'entreprise, clients, abonnement SaaS et boîte d'envoi. */
class CompteController extends Controller
{
    public static function ent(Request $request): Entreprise
    {
        return $request->user()->entreprise;
    }

    public function entreprise(Request $request): JsonResponse
    {
        return response()->json(self::ent($request));
    }

    public function majEntreprise(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nom' => ['required', 'string', 'max:120'], 'adresse' => ['nullable', 'string', 'max:200'], 'telephone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:120'], 'ifu' => ['nullable', 'string', 'max:30'], 'devise' => ['required', 'in:XOF,EUR,USD'],
            'tva_defaut' => ['required', 'numeric', 'between:0,30'], 'delai_paiement' => ['required', 'integer', 'between:0,180'], 'mentions' => ['nullable', 'string', 'max:300'],
        ]);
        $e = self::ent($request);
        $e->update($data);

        return response()->json($e->fresh());
    }

    // ---- Clients
    private function rules(): array
    {
        return ['nom' => ['required', 'string', 'max:120'], 'email' => ['nullable', 'email', 'max:120'], 'telephone' => ['nullable', 'string', 'max:30'], 'adresse' => ['nullable', 'string', 'max:200'], 'ifu' => ['nullable', 'string', 'max:30']];
    }

    public function clients(Request $request): JsonResponse
    {
        $q = self::ent($request)->clients()->withCount('documents')->orderBy('nom');
        if ($t = trim((string) $request->query('q'))) {
            $q->where('nom', 'like', '%'.str_replace(['%', '_'], ['\%', '\_'], $t).'%');
        }

        return response()->json($q->get());
    }

    public function creerClient(Request $request): JsonResponse
    {
        return response()->json(self::ent($request)->clients()->create($request->validate($this->rules())), 201);
    }

    public function majClient(Request $request, int $id): JsonResponse
    {
        $c = self::ent($request)->clients()->findOrFail($id);
        $c->update($request->validate($this->rules()));

        return response()->json($c);
    }

    public function supprimerClient(Request $request, int $id): JsonResponse
    {
        $c = self::ent($request)->clients()->findOrFail($id);
        abort_if($c->documents()->exists(), 422, 'Ce client a des devis ou factures : il ne peut pas être supprimé.');
        $c->delete();

        return response()->json(['message' => 'Client supprimé.']);
    }

    // ---- Abonnement SaaS (paiement simulé)
    public function passerPro(Request $request): JsonResponse
    {
        $d = $request->validate(['mode' => ['required', 'in:momo,moov'], 'numero' => ['required', 'regex:/^\+?[0-9 .\-]{8,20}$/']], ['numero.regex' => 'Numéro Mobile Money invalide.']);
        $e = self::ent($request);
        $e->update(['plan' => 'pro', 'plan_expire_le' => now()->addMonth()->toDateString()]);

        return response()->json(['entreprise' => $e->fresh(), 'reference' => strtoupper(($d['mode'] === 'momo' ? 'MOMO-' : 'MOOV-').Str::random(8))]);
    }

    public function repasserGratuit(Request $request): JsonResponse
    {
        $e = self::ent($request);
        $e->update(['plan' => 'gratuit', 'plan_expire_le' => null]);

        return response()->json($e->fresh());
    }

    public function emails(Request $request): JsonResponse
    {
        return response()->json(Email::where('entreprise_id', self::ent($request)->id)->latest('id')->limit(60)->get());
    }
}
