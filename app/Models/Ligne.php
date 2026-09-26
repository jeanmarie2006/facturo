<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Ligne extends Model
{
    protected $table = 'lignes';

    public $timestamps = false;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['quantite' => 'float', 'prix_unitaire' => 'float'];
    }
}
