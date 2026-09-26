<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Document;
use App\Models\Email;
use App\Models\Entreprise;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FacturoTest extends TestCase
{
    use RefreshDatabase;

    private function compte(string $email = 'a@test.bj', string $plan = 'gratuit'): array
    {
        $u = User::create(['name' => 'Compte '.$email, 'email' => $email, 'password' => 'motdepasse', 'role' => 'user']);
        $e = Entreprise::create(['user_id' => $u->id, 'nom' => 'Entreprise '.$email, 'plan' => $plan, 'plan_expire_le' => $plan === 'pro' ? now()->addMonth() : null]);
        $c = Client::create(['entreprise_id' => $e->id, 'nom' => 'Client de test', 'email' => 'client@test.bj']);

        return [$u, $e, $c];
    }

    private function payload(Client $c, string $type = 'facture'): array
    {
        return ['client_id' => $c->id, 'type' => $type, 'date_emission' => now()->toDateString(), 'devise' => 'XOF', 'taux_tva' => 18,
            'lignes' => [['designation' => 'Site vitrine', 'quantite' => 2, 'prix_unitaire' => 100000], ['designation' => 'Hébergement', 'quantite' => 1, 'prix_unitaire' => 50000]]];
    }

    public function test_inscription_cree_le_compte_et_son_entreprise(): void
    {
        $r = $this->postJson('/api/auth/register', ['name' => 'Awa', 'entreprise' => 'Studio Awa', 'email' => 'awa@test.bj', 'password' => 'motdepasse'])->assertCreated();
        $this->assertSame('Studio Awa', $r->json('entreprise.nom'));
        $this->assertSame('gratuit', $r->json('entreprise.plan'));
        $this->assertSame(5, $r->json('usage.limite'));
    }

    public function test_totaux_tva_et_numerotation_sequentielle(): void
    {
        [$u, , $c] = $this->compte();
        $r = $this->actingAs($u, 'sanctum')->postJson('/api/documents', $this->payload($c))->assertCreated();
        $this->assertEquals(250000, $r->json('total_ht'));
        $this->assertEquals(45000, $r->json('total_tva'));
        $this->assertEquals(295000, $r->json('total_ttc'));
        $this->assertSame('brouillon', $r->json('statut'));
        $this->assertSame('FAC-'.now()->year.'-0001', $r->json('numero'));
        $r2 = $this->actingAs($u, 'sanctum')->postJson('/api/documents', $this->payload($c))->assertCreated();
        $this->assertSame('FAC-'.now()->year.'-0002', $r2->json('numero'));
        $d = $this->actingAs($u, 'sanctum')->postJson('/api/documents', $this->payload($c, 'devis'))->assertCreated();
        $this->assertSame('DEV-'.now()->year.'-0001', $d->json('numero'));
    }

    public function test_isolation_entre_entreprises(): void
    {
        [$a, , $ca] = $this->compte('a@test.bj');
        [$b, , $cb] = $this->compte('b@test.bj');
        $id = $this->actingAs($a, 'sanctum')->postJson('/api/documents', $this->payload($ca))->json('id');
        $this->actingAs($b, 'sanctum')->getJson("/api/documents/{$id}")->assertNotFound();
        $this->actingAs($b, 'sanctum')->getJson("/api/documents/{$id}/pdf")->assertNotFound();
        $this->actingAs($b, 'sanctum')->postJson('/api/documents', $this->payload($ca))->assertStatus(422); // client d'une autre entreprise
        $this->assertCount(0, $this->actingAs($b, 'sanctum')->getJson('/api/documents')->json('data'));
        $this->actingAs($b, 'sanctum')->deleteJson("/api/clients/{$ca->id}")->assertNotFound();
    }

    public function test_le_plan_gratuit_est_limite_a_5_documents_par_mois(): void
    {
        [$u, , $c] = $this->compte();
        foreach (range(1, 5) as $i) {
            $this->actingAs($u, 'sanctum')->postJson('/api/documents', $this->payload($c))->assertCreated();
        }
        $this->actingAs($u, 'sanctum')->postJson('/api/documents', $this->payload($c))->assertStatus(422)->assertJsonPath('code', 'plan_limite');
        [$p, , $cp] = $this->compte('pro@test.bj', 'pro');
        foreach (range(1, 7) as $i) {
            $this->actingAs($p, 'sanctum')->postJson('/api/documents', $this->payload($cp))->assertCreated();
        }
    }

    public function test_seul_un_brouillon_est_modifiable_ou_supprimable(): void
    {
        [$u, , $c] = $this->compte();
        $id = $this->actingAs($u, 'sanctum')->postJson('/api/documents', $this->payload($c))->json('id');
        $this->actingAs($u, 'sanctum')->putJson("/api/documents/{$id}", $this->payload($c))->assertOk();
        $this->actingAs($u, 'sanctum')->postJson("/api/documents/{$id}/envoyer")->assertOk()->assertJsonPath('document.statut', 'envoyee');
        $this->assertSame(1, Email::count());
        $this->actingAs($u, 'sanctum')->putJson("/api/documents/{$id}", $this->payload($c))->assertStatus(422);
        $this->actingAs($u, 'sanctum')->deleteJson("/api/documents/{$id}")->assertStatus(422);
    }

    public function test_une_facture_echue_est_en_retard_et_peut_etre_relancee(): void
    {
        [$u, $e, $c] = $this->compte();
        $id = $this->actingAs($u, 'sanctum')->postJson('/api/documents', $this->payload($c))->json('id');
        $this->actingAs($u, 'sanctum')->postJson("/api/documents/{$id}/relancer")->assertStatus(422); // brouillon
        $this->actingAs($u, 'sanctum')->postJson("/api/documents/{$id}/envoyer")->assertOk();
        Document::find($id)->update(['date_echeance' => now()->subDays(10)->toDateString()]);

        $d = $this->actingAs($u, 'sanctum')->getJson("/api/documents/{$id}")->json();
        $this->assertSame('en_retard', $d['statut_effectif']);
        $this->assertSame(10, $d['jours_retard']);
        $this->assertCount(1, $this->actingAs($u, 'sanctum')->getJson('/api/documents?statut=en_retard')->json('data'));
        $this->actingAs($u, 'sanctum')->postJson("/api/documents/{$id}/relancer")->assertOk()->assertJsonPath('type', 'relance');
        // relance groupée : pas de doublon avant 7 jours
        $this->actingAs($u, 'sanctum')->postJson('/api/relances')->assertOk()->assertJsonPath('relances', 0);
    }

    public function test_paiement_manuel_et_en_ligne(): void
    {
        [$u, , $c] = $this->compte();
        $doc = fn () => $this->actingAs($u, 'sanctum')->postJson('/api/documents', $this->payload($c))->json();
        $a = $doc();
        $this->actingAs($u, 'sanctum')->postJson("/api/documents/{$a['id']}/envoyer");
        $this->actingAs($u, 'sanctum')->postJson("/api/documents/{$a['id']}/payer", ['mode' => 'virement'])->assertOk()->assertJsonPath('statut', 'payee');

        $b = $doc();
        $this->actingAs($u, 'sanctum')->postJson("/api/documents/{$b['id']}/envoyer");
        $token = Document::find($b['id'])->token;
        $this->getJson("/api/public/{$token}")->assertOk()->assertJsonMissingPath('token');
        $this->postJson("/api/public/{$token}/payer", ['mode' => 'momo', 'numero' => 'abc'])->assertStatus(422);
        $this->postJson("/api/public/{$token}/payer", ['mode' => 'momo', 'numero' => '+229 01 96 00 00 00'])->assertOk();
        $this->assertSame('payee', Document::find($b['id'])->statut);
        $this->postJson("/api/public/{$token}/payer", ['mode' => 'momo', 'numero' => '+229 01 96 00 00 00'])->assertStatus(422); // déjà payée
        $this->getJson('/api/public/inconnu')->assertNotFound();
    }

    public function test_un_brouillon_n_est_pas_visible_publiquement(): void
    {
        [$u, , $c] = $this->compte();
        $id = $this->actingAs($u, 'sanctum')->postJson('/api/documents', $this->payload($c))->json('id');
        $this->getJson('/api/public/'.Document::find($id)->token)->assertNotFound();
    }

    public function test_conversion_d_un_devis_en_facture_une_seule_fois(): void
    {
        [$u, , $c] = $this->compte();
        $id = $this->actingAs($u, 'sanctum')->postJson('/api/documents', $this->payload($c, 'devis'))->json('id');
        $this->actingAs($u, 'sanctum')->postJson("/api/documents/{$id}/envoyer");
        $f = $this->actingAs($u, 'sanctum')->postJson("/api/documents/{$id}/convertir")->assertCreated();
        $this->assertSame('facture', $f->json('type'));
        $this->assertEquals(295000, $f->json('total_ttc'));
        $this->assertSame('acceptee', Document::find($id)->statut);
        $this->actingAs($u, 'sanctum')->postJson("/api/documents/{$id}/convertir")->assertStatus(422);
        $this->actingAs($u, 'sanctum')->postJson("/api/documents/{$f->json('id')}/convertir")->assertStatus(422); // pas un devis
    }

    public function test_pdf_export_csv_et_tableau_de_bord(): void
    {
        [$u, , $c] = $this->compte();
        $id = $this->actingAs($u, 'sanctum')->postJson('/api/documents', $this->payload($c))->json('id');
        $this->actingAs($u, 'sanctum')->postJson("/api/documents/{$id}/envoyer");
        $this->actingAs($u, 'sanctum')->postJson("/api/documents/{$id}/payer", ['mode' => 'momo']);
        $pdf = $this->actingAs($u, 'sanctum')->get("/api/documents/{$id}/pdf")->assertOk();
        $this->assertStringStartsWith('%PDF-', $pdf->getContent());
        $csv = $this->actingAs($u, 'sanctum')->get('/api/export/csv')->assertOk()->streamedContent();
        $this->assertStringContainsString('FAC-'.now()->year.'-0001', $csv);
        $this->actingAs($u, 'sanctum')->getJson('/api/dashboard')->assertOk()->assertJsonPath('nb_payees_mois', 1)->assertJsonPath('ca_mois', 295000);
    }

    public function test_validation_des_lignes(): void
    {
        [$u, , $c] = $this->compte();
        $bad = $this->payload($c);
        $bad['lignes'] = [['designation' => '', 'quantite' => 0, 'prix_unitaire' => -5]];
        $this->actingAs($u, 'sanctum')->postJson('/api/documents', $bad)->assertStatus(422)->assertJsonValidationErrors(['lignes.0.designation', 'lignes.0.quantite', 'lignes.0.prix_unitaire']);
        $bad['lignes'] = [];
        $this->actingAs($u, 'sanctum')->postJson('/api/documents', $bad)->assertStatus(422);
    }
}
