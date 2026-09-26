<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Document extends Model
{
    protected $table = 'documents';

    protected $guarded = [];

    protected $appends = ['statut_effectif', 'jours_retard'];

    protected function casts(): array
    {
        return [
            'date_emission' => 'date:Y-m-d', 'date_echeance' => 'date:Y-m-d', 'payee_le' => 'date:Y-m-d', 'derniere_relance' => 'date:Y-m-d',
            'total_ht' => 'float', 'total_tva' => 'float', 'total_ttc' => 'float', 'taux_tva' => 'float',
        ];
    }

    public function entreprise(): BelongsTo
    {
        return $this->belongsTo(Entreprise::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function lignes(): HasMany
    {
        return $this->hasMany(Ligne::class)->orderBy('ordre');
    }

    /** « en_retard » n'est pas stocké : une facture envoyée dont l'échéance est dépassée est en retard. */
    public function getStatutEffectifAttribute(): string
    {
        return $this->type === 'facture' && $this->statut === 'envoyee' && $this->date_echeance?->lt(now()->startOfDay()) ? 'en_retard' : ($this->statut ?? 'brouillon');
    }

    public function getJoursRetardAttribute(): int
    {
        return $this->statut_effectif === 'en_retard' ? (int) $this->date_echeance->diffInDays(now()->startOfDay()) : 0;
    }

    public function recalculer(): void
    {
        $this->loadMissing('lignes');
        $ht = round($this->lignes->sum(fn ($l) => $l->quantite * $l->prix_unitaire), 2);
        $tva = round($ht * $this->taux_tva / 100, 2);
        $this->update(['total_ht' => $ht, 'total_tva' => $tva, 'total_ttc' => $ht + $tva]);
    }

    public function scopeEnRetard($q)
    {
        return $q->where('type', 'facture')->where('statut', 'envoyee')->whereDate('date_echeance', '<', now()->toDateString());
    }
}
