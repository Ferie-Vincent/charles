<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Project extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'code',
        'name',
        'status',
        'lifecycle_status',
        'location',
        'latitude',
        'longitude',
        'budget_amount',
        'caution_bonne_execution_pct',
        'penalites_retard_par_jour',
        'target_progress',
        'current_progress',
        'start_date',
        'end_date',
        // Champs contractuels BTP
        'type_marche',
        'maitre_ouvrage',
        'maitre_oeuvre',
        'bureau_controle',
        'montant_marche',
        // Paramètres financiers — NULL = défaut entreprise
        'tva_rate',
        'retenue_garantie_pct',
        'delai_paiement_jours',
        'avance_demarrage_pct',
        'avance_demarrage_montant_accorde',
        'avance_demarrage_accorde_le',
        'avance_demarrage_accorde_par',
        'delai_execution_jours',
        'date_reception_provisoire',
        'date_reception_definitive',
        'caution_liberee',
        'caution_liberee_at',
        'caution_liberee_par',
        'is_arrete',
        'arret_depuis',
    ];

    protected function casts(): array
    {
        return [
            'budget_amount'              => 'decimal:2',
            'caution_bonne_execution_pct' => 'decimal:2',
            'penalites_retard_par_jour'  => 'decimal:2',
            'montant_marche'             => 'decimal:2',
            'tva_rate'                   => 'float',
            'retenue_garantie_pct'       => 'float',
            'delai_paiement_jours'       => 'integer',
            'target_progress'            => 'integer',
            'current_progress'           => 'integer',
            'avance_demarrage_pct'                => 'integer',
            'avance_demarrage_montant_accorde'    => 'decimal:2',
            'avance_demarrage_accorde_le'         => 'date',
            'avance_demarrage_accorde_par'        => 'integer',
            'delai_execution_jours'               => 'integer',
            'start_date'                 => 'date',
            'end_date'                   => 'date',
            'date_reception_provisoire'  => 'date',
            'date_reception_definitive'  => 'date',
            'caution_liberee'            => 'boolean',
            'caution_liberee_at'         => 'date',
            'is_arrete'                  => 'boolean',
            'arret_depuis'               => 'date',
            'latitude'                   => 'float',
            'longitude'                  => 'float',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function members(): HasMany
    {
        return $this->hasMany(ProjectMember::class);
    }

    public function activities(): HasMany
    {
        return $this->hasMany(ProjectActivity::class);
    }

    public function dailyLogs(): HasMany
    {
        return $this->hasMany(DailyLog::class);
    }

    public function incidents(): HasMany
    {
        return $this->hasMany(Incident::class);
    }

    public function budgetEntries(): HasMany
    {
        return $this->hasMany(BudgetEntry::class);
    }

    public function reports(): HasMany
    {
        return $this->hasMany(ProjectReport::class);
    }

    public function dqeVersions(): HasMany
    {
        return $this->hasMany(DqeVersion::class);
    }

    public function suppliers(): HasMany
    {
        return $this->hasMany(Supplier::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function getPenalitesRetardCalculeesAttribute(): float
    {
        if (!$this->end_date || !$this->penalites_retard_par_jour) {
            return 0;
        }
        $joursRetard = max(0, now()->diffInDays($this->end_date, false) * -1);
        return round($joursRetard * (float)$this->penalites_retard_par_jour, 2);
    }

    /**
     * Le montant figé est prioritaire ; retombe sur la formule dynamique si non encore défini.
     * Figer via avance_demarrage_montant_accorde pour éviter la dérive lors des modifications de montant_marche.
     */
    public function getAvanceDemarrageMontantAttribute(): float
    {
        if ($this->avance_demarrage_montant_accorde !== null) {
            return (float) $this->avance_demarrage_montant_accorde;
        }
        if (!$this->montant_marche || !$this->avance_demarrage_pct) {
            return 0.0;
        }
        return round((float)$this->montant_marche * ($this->avance_demarrage_pct / 100), 2);
    }

    // =========================================================================
    // Paramètres financiers effectifs — résolution projet → entreprise → config/btp
    // =========================================================================

    /** Taux de TVA applicable au chantier (%). */
    public function getEffectiveTvaRateAttribute(): float
    {
        return (float) ($this->tva_rate
            ?? $this->company?->tva_rate
            ?? config('btp.tva_taux_standard', 18));
    }

    /** Taux de retenue de garantie applicable (%). */
    public function getEffectiveRetenueGarantiePctAttribute(): float
    {
        return (float) ($this->retenue_garantie_pct
            ?? $this->company?->retenue_garantie_pct
            ?? config('btp.retenue_garantie_pct', 5));
    }

    /** Délai de paiement MOA attendu après validation d'une situation (jours). */
    public function getEffectiveDelaiPaiementJoursAttribute(): int
    {
        return (int) ($this->delai_paiement_jours
            ?? $this->company?->delai_paiement_jours
            ?? 60);
    }
}
