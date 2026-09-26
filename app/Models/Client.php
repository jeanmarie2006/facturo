<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Client extends Model
{
    protected $table = 'clients';

    protected $guarded = [];

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }
}
