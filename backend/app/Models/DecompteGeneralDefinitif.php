<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DecompteGeneralDefinitif extends Model
{
    protected $table = 'decomptes_generaux_definitifs';

    protected $fillable = [
        'project_id', 'company_id', 'created_by', 'signed_by_moa',
        'montant_marche_initial', 'montant_avenants', 'montant_marche_final',
        'total_situations_ht', 'penalites_retard', 'retenue_garantie_liberee',
        'solde_final', 'status',
        'date_signature_entreprise', 'date_signature_moa', 'observations',
    ];

    protected $casts = [
        'montant_marche_initial'    => 'float',
        'montant_avenants'          => 'float',
        'montant_marche_final'      => 'float',
        'total_situations_ht'       => 'float',
        'penalites_retard'          => 'float',
        'retenue_garantie_liberee'  => 'float',
        'solde_final'               => 'float',
        'date_signature_entreprise' => 'date',
        'date_signature_moa'        => 'date',
    ];

    public function project(): BelongsTo { return $this->belongsTo(Project::class); }
}
