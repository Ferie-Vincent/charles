<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DqeLine extends Model
{
    protected $fillable = [
        'dqe_version_id', 'lot', 'ouvrage', 'unite',
        'quantite', 'prix_unitaire', 'montant_ht', 'ordre',
    ];

    protected $casts = [
        'quantite'      => 'float',
        'prix_unitaire' => 'float',
        'montant_ht'    => 'float',
        'ordre'         => 'integer',
    ];

    protected static function booted(): void
    {
        static::saving(function (self $line) {
            $line->montant_ht = round((float) $line->quantite * (float) $line->prix_unitaire, 2);
        });
    }

    public function version(): BelongsTo
    {
        return $this->belongsTo(DqeVersion::class, 'dqe_version_id');
    }
}
