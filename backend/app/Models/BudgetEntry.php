<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BudgetEntry extends Model
{
    /** Types de source des écritures automatiques (cf. migration add_source_to_budget_entries). */
    public const SOURCE_PURCHASE_ORDER = 'purchase_order';
    public const SOURCE_INVOICE        = 'invoice';
    public const SOURCE_DEMANDE        = 'demande_besoin';
    public const SOURCE_SITUATION      = 'situation_travaux';

    protected $fillable = [
        'project_id', 'created_by', 'type', 'category',
        'label', 'amount', 'entry_date', 'note', 'situation_travaux_id',
        'source_type', 'source_id',
    ];

    protected $casts = [
        'amount'     => 'decimal:2',
        'entry_date' => 'date',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function demandeBesoin(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(DemandeBesoin::class, 'budget_entry_id');
    }

    public function situationTravaux(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(SituationTravaux::class, 'situation_travaux_id');
    }

    // =========================================================================
    // Écritures automatiques — idempotentes par (source_type, source_id, type)
    // =========================================================================

    /**
     * Crée ou met à jour l'écriture liée à une source métier.
     *
     * Rejouer l'événement (retry réseau, double dispatch) ne crée jamais une seconde ligne :
     * la clé unique en base est la garantie finale, ce helper évite simplement l'exception.
     *
     * @param  array<string, mixed>  $attributes  Attributs posés à la création ; seul `amount`
     *                                             (et `note` si fourni) est rafraîchi sur une ligne existante.
     */
    public static function upsertForSource(string $sourceType, int $sourceId, string $type, array $attributes): self
    {
        $entry = self::firstOrNew([
            'source_type' => $sourceType,
            'source_id'   => $sourceId,
            'type'        => $type,
        ]);

        if (! $entry->exists) {
            $entry->fill($attributes);
        } else {
            $entry->amount = $attributes['amount'];
            if (array_key_exists('note', $attributes)) {
                $entry->note = $attributes['note'];
            }
        }

        $entry->save();

        return $entry;
    }

    /**
     * Recalcule (de façon convergente) l'engagement budgétaire d'un bon de commande.
     *
     * Règle : engagé_BDC = total_BDC − Σ factures (validée | payée) rattachées au BDC, borné à 0.
     * Un BDC non actif (brouillon, soumis, rejeté, annulé) n'engage rien.
     *
     * Cette fonction remplace les anciens increment / decrement cumulatifs : quel que soit
     * l'ordre ou le nombre d'événements rejoués, le résultat est le même.
     */
    public static function syncBdcEngagement(PurchaseOrder $bdc, ?User $by = null): ?self
    {
        if (! $bdc->project_id) {
            return null;
        }

        $isActive = in_array($bdc->status, ['approuve', 'recu'], true);

        $invoiced = (float) Invoice::where('purchase_order_id', $bdc->id)
            ->whereIn('status', ['validee', 'payee'])
            ->sum('amount_ht');

        $remaining = round(max(0.0, (float) $bdc->total_amount - $invoiced), 2);

        if (! $isActive || $remaining <= 0) {
            self::where('source_type', self::SOURCE_PURCHASE_ORDER)
                ->where('source_id', $bdc->id)
                ->where('type', 'engagement')
                ->delete();

            if ($bdc->engagement_entry_id !== null) {
                $bdc->updateQuietly(['engagement_entry_id' => null]);
            }

            return null;
        }

        $supplierName = $bdc->supplier?->name ?? ($bdc->supplier_id ? "Fournisseur #{$bdc->supplier_id}" : 'Fournisseur inconnu');

        $entry = self::upsertForSource(self::SOURCE_PURCHASE_ORDER, $bdc->id, 'engagement', [
            'project_id' => $bdc->project_id,
            'created_by' => $by?->id ?? $bdc->approved_by,
            'category'   => 'Matériaux',
            'label'      => "BDC #{$bdc->reference} – {$supplierName}",
            'amount'     => $remaining,
            'entry_date' => ($bdc->approved_at ?? now())->toDateString(),
            'note'       => $invoiced > 0
                ? "Engagement BDC #{$bdc->reference} — reste à facturer (facturé : " . number_format($invoiced, 0, ',', ' ') . ' XOF)'
                : "Engagement automatique – approbation BDC #{$bdc->reference}",
        ]);

        if ($bdc->engagement_entry_id !== $entry->id) {
            $bdc->updateQuietly(['engagement_entry_id' => $entry->id]);
        }

        return $entry;
    }
}
