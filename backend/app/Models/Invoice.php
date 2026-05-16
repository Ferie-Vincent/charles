<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Invoice extends Model
{
    protected $fillable = [
        'project_id', 'supplier_id', 'purchase_order_id', 'created_by', 'direction',
        'reference', 'category', 'type_facturation',
        'amount_ht', 'amount_ttc', 'vat_rate', 'vat_amount', 'currency',
        'retenue_garantie_pct', 'retenue_garantie_amount',
        'ras_pct', 'ras_amount', 'net_a_payer',
        'status', 'invoice_date', 'due_date', 'paid_date', 'note',
        'attachment_path', 'attachment_name',
        'validated_by', 'validated_at', 'paid_by', 'paid_at', 'payment_proof_path', 'payment_proof_name',
    ];

    protected $hidden = ['attachment_path', 'payment_proof_path'];

    protected $casts = [
        'amount_ht'              => 'float',
        'amount_ttc'             => 'float',
        'vat_rate'               => 'integer',
        'vat_amount'             => 'float',
        'retenue_garantie_pct'   => 'float',
        'retenue_garantie_amount'=> 'float',
        'ras_pct'                => 'float',
        'ras_amount'             => 'float',
        'net_a_payer'            => 'float',
        'invoice_date'           => 'date',
        'due_date'               => 'date',
        'paid_date'              => 'date',
        'validated_at'           => 'datetime',
        'paid_at'                => 'datetime',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function validator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validated_by');
    }

    public function payer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'paid_by');
    }
}
