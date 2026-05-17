<?php

namespace Database\Seeders;

use App\Models\Invoice;
use App\Models\Project;
use App\Models\Supplier;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class InvoiceSeeder extends Seeder
{
    public function run(): void
    {
        $director  = User::query()->whereHas('role', fn ($q) => $q->where('name', 'direction'))->firstOrFail();
        $comptable = User::query()->whereHas('role', fn ($q) => $q->where('name', 'comptable'))->first() ?? $director;

        $projects = Project::query()->where('status', 'active')->with('suppliers')->get();
        $invNum   = 1;

        foreach ($projects as $project) {
            $suppliers = $project->suppliers;
            if ($suppliers->isEmpty()) continue;

            $budget   = $project->budget_amount;
            $progress = $project->current_progress / 100;
            $start    = Carbon::parse($project->start_date);

            // Facture 1 – Payée (situation de travaux n°1)
            $f1Supplier = $suppliers->first();
            $f1Ht       = round($budget * $progress * 0.25);
            if ($f1Ht > 0) {
                $this->createInvoice($project, $f1Supplier, $director, $comptable, $invNum++, [
                    'status'       => 'payee',
                    'amount_ht'    => $f1Ht,
                    'invoice_date' => $start->copy()->addMonths(2)->toDateString(),
                    'due_date'     => $start->copy()->addMonths(3)->toDateString(),
                    'paid_date'    => $start->copy()->addMonths(3)->addDays(5)->toDateString(),
                    'note'         => 'Situation de travaux n°1 – avancement ' . round($progress * 25) . '%',
                ]);
            }

            // Facture 2 – Validée (situation n°2 en attente paiement)
            if ($progress > 0.40) {
                $f2Supplier = $suppliers->count() > 1 ? $suppliers->get(1) : $suppliers->first();
                $f2Ht       = round($budget * $progress * 0.20);
                $this->createInvoice($project, $f2Supplier, $director, $comptable, $invNum++, [
                    'status'       => 'validee',
                    'amount_ht'    => $f2Ht,
                    'invoice_date' => $start->copy()->addMonths(4)->toDateString(),
                    'due_date'     => $start->copy()->addMonths(5)->toDateString(),
                    'paid_date'    => null,
                    'note'         => 'Situation de travaux n°2 – validée, en attente règlement',
                ]);
            }

            // Facture 3 – Soumise (récente, pas encore validée)
            if ($progress > 0.55) {
                $f3Supplier = $suppliers->last();
                $f3Ht       = round($budget * 0.08);
                $this->createInvoice($project, $f3Supplier, $director, $comptable, $invNum++, [
                    'status'       => 'soumise',
                    'amount_ht'    => $f3Ht,
                    'invoice_date' => Carbon::today()->subDays(10)->toDateString(),
                    'due_date'     => Carbon::today()->addDays(20)->toDateString(),
                    'paid_date'    => null,
                    'note'         => 'Situation n°3 – soumise à validation',
                ]);
            }
        }
    }

    private function createInvoice(
        Project $project, ?Supplier $supplier, User $director, User $comptable, int $num, array $data
    ): void {
        $amountHt  = $data['amount_ht'];
        if ($amountHt <= 0) return;

        $vatRate    = 18;
        $vatAmount  = round($amountHt * $vatRate / 100);
        $ttc        = $amountHt + $vatAmount;
        $retPct     = 5.0;
        $retAmount  = round($amountHt * $retPct / 100);
        $rasPct     = 0.0;
        $rasAmount  = 0;
        $netAPayer  = $ttc - $retAmount;

        $validatedAt = ($data['status'] !== 'soumise') ? Carbon::parse($data['invoice_date'])->addDays(5) : null;
        $paidAt      = ($data['status'] === 'payee')   ? Carbon::parse($data['paid_date'])                : null;

        Invoice::query()->updateOrCreate(
            ['project_id' => $project->id, 'reference' => 'FAC-' . str_pad($num, 5, '0', STR_PAD_LEFT)],
            [
                'supplier_id'             => $supplier?->id,
                'created_by'              => $comptable->id,
                'direction'               => 'fournisseur',
                'reference'               => 'FAC-' . str_pad($num, 5, '0', STR_PAD_LEFT),
                'category'                => $supplier?->category ?? 'Matériaux',
                'type_facturation'        => 'situation_travaux',
                'amount_ht'               => $amountHt,
                'vat_rate'                => $vatRate,
                'vat_amount'              => $vatAmount,
                'amount_ttc'              => $ttc,
                'retenue_garantie_pct'    => $retPct,
                'retenue_garantie_amount' => $retAmount,
                'ras_pct'                 => $rasPct,
                'ras_amount'              => $rasAmount,
                'net_a_payer'             => $netAPayer,
                'currency'                => 'XOF',
                'status'                  => $data['status'],
                'invoice_date'            => $data['invoice_date'],
                'due_date'                => $data['due_date'],
                'paid_date'               => $data['paid_date'],
                'note'                    => $data['note'],
                'validated_by'            => $validatedAt ? $director->id : null,
                'validated_at'            => $validatedAt,
                'paid_by'                 => $paidAt ? $comptable->id : null,
                'paid_at'                 => $paidAt,
            ]
        );
    }
}
