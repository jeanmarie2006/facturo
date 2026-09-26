<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Chaque compte = une entreprise
        Schema::create('entreprises', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('nom', 120);
            $table->string('adresse', 200)->nullable();
            $table->string('telephone', 30)->nullable();
            $table->string('email', 120)->nullable();
            $table->string('ifu', 30)->nullable();                  // identifiant fiscal unique (Bénin)
            $table->string('devise', 3)->default('XOF');            // XOF | EUR | USD
            $table->decimal('tva_defaut', 5, 2)->default(18);
            $table->unsignedSmallInteger('delai_paiement')->default(30);
            $table->string('mentions', 300)->nullable();            // pied de facture (coordonnées bancaires, mobile money…)
            $table->string('plan', 10)->default('gratuit');         // gratuit | pro
            $table->date('plan_expire_le')->nullable();
            $table->timestamps();
        });

        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entreprise_id')->constrained()->cascadeOnDelete();
            $table->string('nom', 120);
            $table->string('email', 120)->nullable();
            $table->string('telephone', 30)->nullable();
            $table->string('adresse', 200)->nullable();
            $table->string('ifu', 30)->nullable();
            $table->timestamps();
        });

        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entreprise_id')->constrained()->cascadeOnDelete();
            $table->foreignId('client_id')->constrained('clients')->restrictOnDelete();
            $table->string('type', 8);                                // devis | facture
            $table->string('numero', 24);
            $table->string('statut', 10)->default('brouillon');       // brouillon | envoyee | payee | acceptee | refusee
            $table->date('date_emission');
            $table->date('date_echeance');
            $table->string('devise', 3)->default('XOF');
            $table->decimal('taux_tva', 5, 2)->default(18);
            $table->string('notes', 400)->nullable();
            $table->decimal('total_ht', 14, 2)->default(0);
            $table->decimal('total_tva', 14, 2)->default(0);
            $table->decimal('total_ttc', 14, 2)->default(0);
            $table->date('payee_le')->nullable();
            $table->string('paiement_mode', 12)->nullable();
            $table->string('paiement_ref', 24)->nullable();
            $table->foreignId('devis_id')->nullable();                 // facture issue d'un devis
            $table->string('token', 40)->unique();                     // lien public de paiement
            $table->date('derniere_relance')->nullable();
            $table->timestamps();
            $table->unique(['entreprise_id', 'numero']);
            $table->index(['entreprise_id', 'type', 'statut']);
        });

        Schema::create('lignes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained('documents')->cascadeOnDelete();
            $table->string('designation', 200);
            $table->decimal('quantite', 10, 2)->default(1);
            $table->decimal('prix_unitaire', 14, 2)->default(0);
            $table->unsignedSmallInteger('ordre')->default(0);
        });

        // Boîte d'envoi : e-mails envoyés (simulés) aux clients
        Schema::create('emails', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entreprise_id')->constrained()->cascadeOnDelete();
            $table->foreignId('document_id')->nullable()->constrained('documents')->nullOnDelete();
            $table->string('destinataire', 120);
            $table->string('sujet', 160);
            $table->text('corps');
            $table->string('type', 12)->default('envoi');              // envoi | relance | recu
            $table->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['emails', 'lignes', 'documents', 'clients', 'entreprises'] as $t) {
            Schema::dropIfExists($t);
        }
    }
};
