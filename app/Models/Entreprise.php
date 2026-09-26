<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Entreprise extends Model
{
    protected $table = 'entreprises';

    protected $guarded = [];

    protected $appends = ['est_pro', 'limite_mensuelle'];

    public const LIMITE_GRATUIT = 5;

    protected function casts(): array
    {
        return ['plan_expire_le' => 'date:Y-m-d', 'tva_defaut' => 'float'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function clients(): HasMany
    {
        return $this->hasMany(Client::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

    public function getEstProAttribute(): bool
    {
        return $this->plan === 'pro' && $this->plan_expire_le && $this->plan_expire_le->endOfDay()->isFuture();
    }

    /** Nombre de documents autorisés par mois (null = illimité). */
    public function getLimiteMensuelleAttribute(): ?int
    {
        return $this->est_pro ? null : self::LIMITE_GRATUIT;
    }

    public function prochainNumero(string $type): string
    {
        $prefixe = $type === 'facture' ? 'FAC' : 'DEV';
        $annee = now()->year;
        $dernier = $this->documents()->where('type', $type)->where('numero', 'like', "{$prefixe}-{$annee}-%")->orderByDesc('numero')->value('numero');
        $n = $dernier ? ((int) substr($dernier, -4)) + 1 : 1;

        return sprintf('%s-%d-%04d', $prefixe, $annee, $n);
    }
}
