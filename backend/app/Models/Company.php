<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Company extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'ai_enabled',
        'ai_provider',
        'ai_api_key',
        // Défauts financiers entreprise (surchargés par chantier)
        'tva_rate',
        'retenue_garantie_pct',
        'delai_paiement_jours',
    ];

    protected $casts = [
        'ai_enabled'           => 'boolean',
        'ai_api_key'           => 'encrypted',
        'tva_rate'             => 'float',
        'retenue_garantie_pct' => 'float',
        'delai_paiement_jours' => 'integer',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }
}
