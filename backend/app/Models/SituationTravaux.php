<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SituationTravaux extends Model
{
    protected $table = 'situation_travaux';

    protected $fillable = [
        'project_id', 'company_id', 'dqe_version_id', 'created_by', 'validated_by', 'paid_by',
        'numero', 'periode', 'avancement_pct',
        'montant_brut_ht', 'cumul_precedent_ht',
        'retenue_garantie_pct', 'retenue_garantie_amount',
        'avance_remboursement', 'vat_rate', 'vat_amount', 'net_a_payer',
        'status', 'submitted_at', 'validated_at', 'paid_at', 'date_paiement',
        'detail_lots', 'rapport_ia', 'ged_document_id', 'notes',
    ];

    protected $casts = [
        'avancement_pct'          => 'float',
        'montant_brut_ht'         => 'float',
        'cumul_precedent_ht'      => 'float',
        'retenue_garantie_pct'    => 'float',
        'retenue_garantie_amount' => 'float',
        'avance_remboursement'    => 'float',
        'vat_rate'                => 'float',
        'vat_amount'              => 'float',
        'net_a_payer'             => 'float',
        'detail_lots'             => 'array',
        'submitted_at'            => 'datetime',
        'validated_at'            => 'datetime',
        'paid_at'                 => 'datetime',
        'date_paiement'           => 'date',
    ];

    public function project(): BelongsTo    { return $this->belongsTo(Project::class); }
    public function dqeVersion(): BelongsTo { return $this->belongsTo(DqeVersion::class); }
    public function creator(): BelongsTo    { return $this->belongsTo(User::class, 'created_by'); }
    public function validator(): BelongsTo  { return $this->belongsTo(User::class, 'validated_by'); }

    public static function computeAvanceRemboursement(Project $project, float $montantBrut): float
    {
        if (!$project->montant_marche || !$project->avance_demarrage_pct) {
            return 0;
        }
        return round($montantBrut * ($project->avance_demarrage_pct / 100), 2);
    }
}
