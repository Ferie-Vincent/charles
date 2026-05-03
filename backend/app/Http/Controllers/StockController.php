<?php

namespace App\Http\Controllers;

use App\Models\StockItem;
use App\Models\StockMovement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class StockController extends Controller
{
    private const CATEGORIES = ['materiaux', 'equipement', 'fournitures', 'consommables', 'autre'];

    // ── Stock Items ────────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $items = StockItem::where('company_id', $request->user()->company_id)
            ->withCount('movements')
            ->orderBy('name')
            ->get()
            ->map(fn($item) => array_merge($item->toArray(), ['is_low' => $item->is_low]));

        return response()->json($items);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless(
            in_array($request->user()->role->name, ['moyens-generaux', 'direction', 'directeur-technique']),
            403,
            'Gestion des articles réservée à la logistique.'
        );

        $data = $request->validate([
            'name'      => 'required|string|max:255',
            'reference' => 'nullable|string|max:100',
            'category'  => 'required|in:' . implode(',', self::CATEGORIES),
            'unit'      => 'required|string|max:30',
            'quantity'  => 'required|numeric|min:0',
            'threshold' => 'nullable|numeric|min:0',
            'location'  => 'nullable|string|max:255',
            'notes'     => 'nullable|string|max:1000',
        ]);

        $item = StockItem::create([
            ...$data,
            'company_id' => $request->user()->company_id,
            'created_by' => $request->user()->id,
        ]);

        return response()->json($item, 201);
    }

    public function update(Request $request, StockItem $stockItem): JsonResponse
    {
        abort_if($stockItem->company_id !== $request->user()->company_id, 403);
        abort_unless(
            in_array($request->user()->role->name, ['moyens-generaux', 'direction', 'directeur-technique']),
            403,
            'Gestion des articles réservée à la logistique.'
        );

        $data = $request->validate([
            'name'      => 'sometimes|required|string|max:255',
            'reference' => 'nullable|string|max:100',
            'category'  => 'sometimes|required|in:' . implode(',', self::CATEGORIES),
            'unit'      => 'sometimes|required|string|max:30',
            'threshold' => 'nullable|numeric|min:0',
            'location'  => 'nullable|string|max:255',
            'notes'     => 'nullable|string|max:1000',
        ]);

        $stockItem->update($data);

        return response()->json(array_merge($stockItem->toArray(), ['is_low' => $stockItem->is_low]));
    }

    public function destroy(Request $request, StockItem $stockItem): Response
    {
        abort_if($stockItem->company_id !== $request->user()->company_id, 403);
        abort_unless(
            in_array($request->user()->role->name, ['moyens-generaux', 'direction', 'directeur-technique']),
            403,
            'Gestion des articles réservée à la logistique.'
        );
        $stockItem->delete();
        return response()->noContent();
    }

    // ── Movements ─────────────────────────────────────────────────────

    public function movements(Request $request, StockItem $stockItem): JsonResponse
    {
        abort_if($stockItem->company_id !== $request->user()->company_id, 403);

        $movements = $stockItem->movements()
            ->with('creator:id,name', 'project:id,name,code')
            ->orderByDesc('movement_date')
            ->orderByDesc('id')
            ->limit(50)
            ->get();

        return response()->json($movements);
    }

    public function addMovement(Request $request, StockItem $stockItem): JsonResponse
    {
        abort_if($stockItem->company_id !== $request->user()->company_id, 403);
        abort_unless(
            in_array($request->user()->role->name, [
                'moyens-generaux', 'conducteur-travaux', 'chef-chantier',
                'direction', 'directeur-technique',
            ]),
            403,
            'Mouvement de stock non autorisé pour ce rôle.'
        );

        $data = $request->validate([
            'type'          => 'required|in:entree,sortie,ajustement',
            'quantity'      => 'required|numeric|min:0.01',
            'reason'        => 'required|string|max:255',
            'movement_date' => 'required|date',
            'project_id'    => 'nullable|exists:projects,id',
            'notes'         => 'nullable|string|max:500',
        ]);

        $movement = null;
        $insufficientStock = false;

        DB::transaction(function () use ($stockItem, $data, $request, &$movement, &$insufficientStock) {
            // Recharger avec lock pour éviter race condition
            $lockedItem = StockItem::lockForUpdate()->find($stockItem->id);

            if ($data['type'] === 'sortie' && $data['quantity'] > $lockedItem->quantity) {
                $insufficientStock = $lockedItem->quantity . ' ' . $lockedItem->unit;
                return;
            }

            // FIX H3: for ajustement, store the signed delta (not the absolute target) so
            // movement history remains mathematically consistent (SUM of quantities = net stock change).
            $movementData = $data;
            if ($data['type'] === 'ajustement') {
                $movementData['quantity'] = $data['quantity'] - $lockedItem->quantity;
            }

            $movement = $lockedItem->movements()->create([
                ...$movementData,
                'created_by' => $request->user()->id,
            ]);

            if ($data['type'] === 'ajustement') {
                $lockedItem->update(['quantity' => $data['quantity']]);
            } elseif ($data['type'] === 'entree') {
                $lockedItem->increment('quantity', $data['quantity']);
            } else {
                $lockedItem->decrement('quantity', $data['quantity']);
            }

        });

        if ($insufficientStock !== false) {
            return response()->json([
                'message' => 'Stock insuffisant. Disponible : ' . $insufficientStock,
            ], 422);
        }

        $stockItem->refresh();
        $movement->load('creator:id,name', 'project:id,name,code');

        return response()->json([
            'movement' => $movement,
            'stock'    => array_merge($stockItem->toArray(), ['is_low' => $stockItem->is_low]),
        ], 201);
    }
}
