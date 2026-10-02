<?php

namespace App\Console\Commands;

use App\Models\BudgetEntry;
use App\Models\PurchaseOrder;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('budget:reconcile {--dry-run : Affiche les dérives sans rien écrire}')]
#[Description('Recalcule les engagements budgétaires BDC depuis la source (BDC − factures) et signale les dérives')]
class ReconcileBudgetEntries extends Command
{
    public function handle(): int
    {
        $dry   = (bool) $this->option('dry-run');
        $drift = 0;

        $bdcs = PurchaseOrder::with('supplier:id,name')->whereNotNull('project_id')->get();

        foreach ($bdcs as $bdc) {
            $before = (float) BudgetEntry::where('source_type', BudgetEntry::SOURCE_PURCHASE_ORDER)
                ->where('source_id', $bdc->id)
                ->where('type', 'engagement')
                ->value('amount');

            // Montant attendu — même formule que BudgetEntry::syncBdcEngagement
            $invoiced = (float) $bdc->project->invoices()
                ->where('purchase_order_id', $bdc->id)
                ->whereIn('status', ['validee', 'payee'])
                ->sum('amount_ht');
            $expected = in_array($bdc->status, ['approuve', 'recu'], true)
                ? round(max(0.0, (float) $bdc->total_amount - $invoiced), 2)
                : 0.0;

            if (abs($before - $expected) > 0.009) {
                $drift++;
                $this->line(sprintf(
                    '  BDC #%s (projet %d) : écrit %s → attendu %s',
                    $bdc->reference,
                    $bdc->project_id,
                    number_format($before, 0, ',', ' '),
                    number_format($expected, 0, ',', ' ')
                ));
            }

            if (! $dry) {
                BudgetEntry::syncBdcEngagement($bdc);
            }
        }

        // Écritures « engagement » orphelines : étiquetées BDC mais sans source (héritage pré-migration)
        $orphans = BudgetEntry::where('type', 'engagement')
            ->whereNull('source_type')
            ->where('label', 'like', 'BDC #%')
            ->count();

        if ($orphans > 0) {
            $this->warn("  {$orphans} engagement(s) libellé(s) « BDC #… » sans source — saisies manuelles ou héritage à vérifier.");
        }

        $this->info(($dry ? '[dry-run] ' : '') . "{$bdcs->count()} BDC analysés, {$drift} dérive(s)" . ($dry ? ' détectée(s).' : ' corrigée(s).'));

        return self::SUCCESS;
    }
}
