<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\Document;
use App\Models\Entreprise;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/** Compte de démonstration : « Studio Kpanou », agence web freelance de Cotonou, avec ses clients, devis et factures. */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        mt_srand(21);
        $u = User::create(['name' => 'Sedjame Kpanou', 'email' => 'demo@facturo.bj', 'password' => 'demo1234', 'role' => 'user']);
        $e = Entreprise::create([
            'user_id' => $u->id, 'nom' => 'Studio Kpanou', 'adresse' => 'Rue 12.345, Akpakpa, Cotonou', 'telephone' => '+229 01 97 00 11 22', 'email' => 'contact@studiokpanou.example',
            'ifu' => '3202512345678', 'devise' => 'XOF', 'tva_defaut' => 18, 'delai_paiement' => 30,
            'mentions' => 'Paiement par MTN MoMo au 01 97 00 11 22 ou virement bancaire — UBA Bénin, IBAN BJ00 0000 0000 0000. Pénalité de retard : 3 % par mois.',
            'plan' => 'pro', 'plan_expire_le' => now()->addDays(20)->toDateString(),
        ]);

        $clients = [];
        foreach ([
            ['Boulangerie Le Pain Doré', 'contact@paindore.example', '+229 01 96 11 11 11', 'Haie Vive, Cotonou'], ['Cabinet Hounkpatin & Associés', 'secretariat@hounkpatin.example', '+229 01 95 22 22 22', 'Cadjèhoun, Cotonou'],
            ['Clinique Sainte-Marie', 'admin@saintemarie.example', '+229 01 94 33 33 33', 'Parakou'], ['Auto-École Le Volant', 'info@levolant.example', '+229 01 93 44 44 44', 'Abomey-Calavi'],
            ['Hôtel Océan Bleu', 'direction@oceanbleu.example', '+229 01 92 55 55 55', 'Fidjrossè, Cotonou'], ['ONG Sourire d’Afrique', 'projets@sourire.example', '+229 01 91 66 66 66', 'Porto-Novo'],
        ] as [$n, $m, $t, $a]) {
            $clients[] = Client::create(['entreprise_id' => $e->id, 'nom' => $n, 'email' => $m, 'telephone' => $t, 'adresse' => $a]);
        }

        $prestations = [['Création de site vitrine (5 pages)', 250000], ['Refonte de logo et charte graphique', 120000], ['Hébergement et maintenance annuelle', 60000], ['Formation à la gestion du site (demi-journée)', 45000], ['Application de réservation sur mesure', 480000], ['Référencement (SEO) — pack de démarrage', 90000], ['Shooting photo produits (20 photos)', 75000], ['Community management — 1 mois', 80000]];

        $creer = function (string $type, Client $c, string $statut, \Carbon\Carbon $emission, int $nb, ?string $mode = null, ?\Carbon\Carbon $payee = null) use ($e, $prestations) {
            $d = Document::create([
                'entreprise_id' => $e->id, 'client_id' => $c->id, 'type' => $type, 'numero' => $e->prochainNumero($type), 'statut' => $statut, 'date_emission' => $emission->toDateString(),
                'date_echeance' => $emission->copy()->addDays(30)->toDateString(), 'devise' => 'XOF', 'taux_tva' => 18, 'token' => Str::random(32),
                'payee_le' => $payee?->toDateString(), 'paiement_mode' => $mode, 'paiement_ref' => $mode ? strtoupper(Str::random(8)) : null, 'created_at' => $emission, 'updated_at' => $emission,
            ]);
            foreach ((array) array_rand($prestations, $nb) as $i => $k) {
                $d->lignes()->create(['designation' => $prestations[$k][0], 'quantite' => $k === 7 ? mt_rand(1, 3) : 1, 'prix_unitaire' => $prestations[$k][1], 'ordre' => $i]);
            }
            $d->recalculer();

            return $d;
        };

        // 5 mois d'historique de factures payées
        for ($m = 5; $m >= 1; $m--) {
            for ($k = 0; $k < mt_rand(2, 4); $k++) {
                $em = now()->subMonths($m)->startOfMonth()->addDays(mt_rand(1, 20));
                $creer('facture', $clients[array_rand($clients)], 'payee', $em, mt_rand(1, 2), ['momo', 'virement', 'moov', 'especes'][mt_rand(0, 3)], $em->copy()->addDays(mt_rand(5, 25)));
            }
        }
        // ce mois-ci : payées, en attente, en retard, brouillon
        $creer('facture', $clients[0], 'payee', now()->subDays(12), 1, 'momo', now()->subDays(3));
        $creer('facture', $clients[4], 'payee', now()->subDays(9), 2, 'virement', now()->subDays(2));
        $creer('facture', $clients[1], 'envoyee', now()->subDays(6), 2);
        $creer('facture', $clients[3], 'envoyee', now()->subDays(3), 1);
        $creer('facture', $clients[2], 'envoyee', now()->subDays(48), 2);      // en retard
        $creer('facture', $clients[5], 'envoyee', now()->subDays(41), 1);      // en retard
        $creer('facture', $clients[4], 'brouillon', now(), 1);
        $creer('devis', $clients[5], 'envoyee', now()->subDays(4), 2);
        $creer('devis', $clients[2], 'envoyee', now()->subDays(2), 1);
        $creer('devis', $clients[1], 'acceptee', now()->subDays(15), 2);
        $creer('devis', $clients[0], 'brouillon', now(), 1);
    }
}
