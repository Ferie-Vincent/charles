<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MaterialReceiptController extends Controller
{
    public function index(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $logs = $project->dailyLogs()
            ->whereNotNull('materials_received')
            ->orderByDesc('log_date')
            ->get(['log_date', 'materials_received']);

        // Agréger les totaux par nom de matériau
        $totals = [];
        $entries = [];

        foreach ($logs as $log) {
            $items = $log->materials_received ?? [];
            foreach ($items as $item) {
                $name = $item['name'] ?? '';
                if (! $name) continue;

                if (! isset($totals[$name])) {
                    $totals[$name] = [
                        'name'          => $name,
                        'total_qty'     => 0,
                        'unit'          => $item['unit'] ?? 'unités',
                        'last_date'     => $log->log_date,
                        'delivery_count'=> 0,
                    ];
                }

                $totals[$name]['total_qty']      += (float) ($item['quantity'] ?? 0);
                $totals[$name]['delivery_count'] += 1;

                $entries[] = [
                    'date'     => $log->log_date,
                    'name'     => $name,
                    'quantity' => (float) ($item['quantity'] ?? 0),
                    'unit'     => $item['unit'] ?? 'unités',
                ];
            }
        }

        // Trier les totaux par total_qty décroissant
        usort($totals, fn($a, $b) => $b['total_qty'] <=> $a['total_qty']);

        return response()->json([
            'totals'        => array_values($totals),
            'entries'       => array_slice($entries, 0, 50), // 50 dernières lignes de livraison
            'rapprochement' => $this->rapprochementStock($project, $totals),
        ]);
    }

    /**
     * Rapprochement « deux vérités du ciment » : ce que le journal déclare reçu sur site vs ce que
     * le magasin central a sorti vers ce chantier (stock_movements.type = sortie, project_id).
     * Jointure par nom de matériau (insensible à la casse/accents) — approximation assumée tant
     * que materials_received n'est pas lié à stock_item_id.
     *
     * @param  array<int, array{name:string,total_qty:float,unit:string}>  $journalTotals
     * @return array<int, array{name:string,unit:string,journal_qty:float,stock_qty:float,ecart_qty:float,stock_value:float,status:string}>
     */
    private function rapprochementStock(Project $project, array $journalTotals): array
    {
        $sorties = \App\Models\StockMovement::query()
            ->where('stock_movements.project_id', $project->id)
            ->where('stock_movements.type', 'sortie')
            ->join('stock_items', 'stock_items.id', '=', 'stock_movements.stock_item_id')
            ->groupBy('stock_items.name', 'stock_items.unit')
            ->selectRaw('stock_items.name as name, stock_items.unit as unit, SUM(stock_movements.quantity) as qty, SUM(COALESCE(stock_movements.total_cost, 0)) as value')
            ->get();

        $norm = fn (string $n) => mb_strtolower(trim(preg_replace('/\s+/', ' ', \Illuminate\Support\Str::ascii($n))));

        $rows = [];
        foreach ($journalTotals as $t) {
            $rows[$norm($t['name'])] = [
                'name'        => $t['name'],
                'unit'        => $t['unit'],
                'journal_qty' => (float) $t['total_qty'],
                'stock_qty'   => 0.0,
                'stock_value' => 0.0,
            ];
        }
        foreach ($sorties as $sItem) {
            $k = $norm($sItem->name);
            if (! isset($rows[$k])) {
                $rows[$k] = ['name' => $sItem->name, 'unit' => $sItem->unit, 'journal_qty' => 0.0, 'stock_qty' => 0.0, 'stock_value' => 0.0];
            }
            $rows[$k]['stock_qty']   += (float) $sItem->qty;
            $rows[$k]['stock_value'] += (float) $sItem->value;
        }

        return collect($rows)->map(function ($r) {
            $ecart = round($r['journal_qty'] - $r['stock_qty'], 2);
            $r['ecart_qty']   = $ecart;
            $r['stock_value'] = round($r['stock_value'], 2);
            // ok : écart ≤ 5 % · journal_only : reçu sur site sans sortie magasin (achat direct ?) ·
            // stock_only : sorti du magasin mais jamais déclaré reçu (coulage ?) · ecart : les deux existent mais divergent
            $r['status'] = match (true) {
                $r['stock_qty'] <= 0 && $r['journal_qty'] > 0 => 'journal_only',
                $r['journal_qty'] <= 0 && $r['stock_qty'] > 0 => 'stock_only',
                abs($ecart) <= 0.05 * max($r['journal_qty'], $r['stock_qty']) => 'ok',
                default => 'ecart',
            };
            return $r;
        })->sortBy(fn ($r) => ['ecart' => 0, 'stock_only' => 1, 'journal_only' => 2, 'ok' => 3][$r['status']])->values()->all();
    }
}
