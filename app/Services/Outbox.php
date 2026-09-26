<?php

namespace App\Services;

use App\Models\Document;
use App\Models\Email;
use Illuminate\Support\Facades\Mail;

/** Envoi des e-mails aux clients : enregistrés dans la « boîte d'envoi » et écrits dans le journal (mailer « log »). */
class Outbox
{
    public static function lien(Document $d): string
    {
        return rtrim(url('/'), '/').'/#/payer/'.$d->token;
    }

    public static function envoyer(Document $d, string $type = 'envoi'): Email
    {
        $d->loadMissing('client', 'entreprise');
        $e = $d->entreprise;
        $montant = Format::montant($d->total_ttc, $d->devise);
        [$sujet, $corps] = match (true) {
            $type === 'relance' => ["Rappel : facture {$d->numero} impayée", "Bonjour {$d->client->nom},\n\nSauf erreur de notre part, la facture {$d->numero} d'un montant de {$montant}, échue le {$d->date_echeance->format('d/m/Y')}, reste impayée ({$d->jours_retard} jour(s) de retard).\nVous pouvez la régler en ligne : ".self::lien($d)."\n\nCordialement,\n{$e->nom}"],
            $type === 'recu' => ["Reçu de paiement — {$d->numero}", "Bonjour {$d->client->nom},\n\nNous confirmons la réception de votre paiement de {$montant} pour la facture {$d->numero}. Merci !\n\n{$e->nom}"],
            $d->type === 'devis' => ["Devis {$d->numero} — {$e->nom}", "Bonjour {$d->client->nom},\n\nVeuillez trouver notre devis {$d->numero} d'un montant de {$montant}, valable jusqu'au {$d->date_echeance->format('d/m/Y')}.\nConsultation : ".self::lien($d)."\n\nCordialement,\n{$e->nom}"],
            default => ["Facture {$d->numero} — {$e->nom}", "Bonjour {$d->client->nom},\n\nVeuillez trouver votre facture {$d->numero} d'un montant de {$montant}, à régler avant le {$d->date_echeance->format('d/m/Y')}.\nPaiement en ligne : ".self::lien($d)."\n\nCordialement,\n{$e->nom}"],
        };
        $dest = $d->client->email ?: '(pas d’e-mail client)';
        if ($d->client->email) {
            Mail::raw($corps, fn ($m) => $m->to($d->client->email)->subject($sujet));
        }

        return Email::create(['entreprise_id' => $e->id, 'document_id' => $d->id, 'destinataire' => $dest, 'sujet' => $sujet, 'corps' => $corps, 'type' => $type]);
    }
}
