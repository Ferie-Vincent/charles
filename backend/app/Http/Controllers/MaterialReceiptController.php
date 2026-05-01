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

        // Aggregate totals per material name
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

        // Sort totals by total_qty desc
        usort($totals, fn($a, $b) => $b['total_qty'] <=> $a['total_qty']);

        return response()->json([
            'totals'  => array_values($totals),
            'entries' => array_slice($entries, 0, 50), // last 50 delivery lines
        ]);
    }
}
