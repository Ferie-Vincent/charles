<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Avenant extends Model
{
    use HasFactory;
    protected $fillable = [
        'project_id', 'company_id', 'created_by',
        'numero', 'objet', 'type', 'montant_ht',
        'delai_supplementaire_jours', 'status', 'date_signature', 'notes',
    ];

    protected $casts = [
        'montant_ht'                 => 'decimal:2',
        'delai_supplementaire_jours' => 'integer',
        'date_signature'             => 'date',
    ];

    public function project(): BelongsTo { return $this->belongsTo(Project::class); }
    public function creator(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }
}
