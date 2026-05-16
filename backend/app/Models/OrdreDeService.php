<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrdreDeService extends Model
{
    protected $table = 'ordres_de_service';

    protected $fillable = [
        'project_id', 'company_id', 'emis_par',
        'numero', 'type', 'objet', 'date_os',
        'delai_impact_jours', 'description',
        'document_path', 'accuse_reception', 'date_accuse',
    ];

    protected $casts = [
        'date_os'            => 'date',
        'date_accuse'        => 'date',
        'accuse_reception'   => 'boolean',
        'delai_impact_jours' => 'integer',
    ];

    protected $hidden = ['document_path'];
    protected $appends = ['document_url'];

    public function getDocumentUrlAttribute(): ?string
    {
        return $this->document_path ? asset('storage/' . $this->document_path) : null;
    }

    public function project(): BelongsTo  { return $this->belongsTo(Project::class); }
    public function emetteur(): BelongsTo { return $this->belongsTo(User::class, 'emis_par'); }
}
