<?php

namespace App\Http\Controllers;

use App\Events\BdcApproved;
use App\Events\BdcCancelled;
use App\Events\BdcReceived;
use App\Models\PurchaseOrder;
use App\Support\Roles;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class PurchaseOrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user  = $request->user();
        $query = PurchaseOrder::where('company_id', $user->company_id)
            ->with('supplier:id,name', 'project:id,name,code', 'requester:id,name', 'approver:id,name')
            ->orderByDesc('created_at');

        // FIX H10: terrain roles only see BDCs linked to their own projects
        $role = $user->role->name;
        if (in_array($role, Roles::TERRAIN)) {
            $query->whereHas('project', function ($q) use ($user) {
                $q->whereHas('members', function ($q2) use ($user) {
                    $q2->where('user_id', $user->id);
                });
            });
        }

        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        abort_unless(
            in_array($user->role->name, Roles::BDC_CREATORS),
            403,
            'Création de BDC non autorisée pour ce rôle.'
        );

        $data = $request->validate([
            'supplier_id'         => ['nullable', Rule::exists('suppliers', 'id')->where('company_id', $user->company_id)],
            'project_id'          => ['nullable', Rule::exists('projects', 'id')->where('company_id', $user->company_id)],
            'items'               => 'required|array|min:1',
            'items.*.description' => 'required|string|max:255',
            'items.*.quantity'    => 'required|numeric|min:0.01',
            'items.*.unit'        => 'required|string|max:30',
            'items.*.unit_price'  => 'required|numeric|min:0',
            'items.*.stock_item_id' => ['nullable', 'integer', Rule::exists('stock_items', 'id')->where('company_id', $user->company_id)],
            'expected_delivery'   => 'nullable|date',
            'notes'               => 'nullable|string|max:1000',
        ]);

        $items = collect($data['items'])->map(fn($i) => [
            ...$i,
            'total' => round($i['quantity'] * $i['unit_price'], 2),
        ])->all();

        $total = collect($items)->sum('total');

        // FIX C5: create() moved inside the transaction so the lock covers the insert
        $order = DB::transaction(function () use ($user, $data, $items, $total) {
            $year  = now()->year;
            $count = PurchaseOrder::where('company_id', $user->company_id)
                ->whereYear('created_at', $year)
                ->lockForUpdate()
                ->count();
            $reference = sprintf('BDC-%d-%03d', $year, $count + 1);

            return PurchaseOrder::create([
                ...$data,
                'items'        => $items,
                'total_amount' => $total,
                'reference'    => $reference,
                'company_id'   => $user->company_id,
                'requested_by' => $user->id,
                'status'       => 'brouillon',
            ]);
        });

        $order->load('supplier:id,name', 'project:id,name,code', 'requester:id,name');

        return response()->json($order, 201);
    }

    public function update(Request $request, PurchaseOrder $purchaseOrder): JsonResponse
    {
        abort_if($purchaseOrder->company_id !== $request->user()->company_id, 403);
        abort_if(!in_array($purchaseOrder->status, ['brouillon', 'soumis']), 422, 'Seuls les BDC brouillon ou soumis peuvent être modifiés.');

        $user = $request->user();
        $role = $user->role->name;

        abort_unless(
            in_array($role, Roles::BDC_CREATORS),
            403,
            'Modification de BDC non autorisée pour ce rôle.'
        );

        // FIX M9: approvers cannot modify a submitted BDC they didn't create — reject it instead
        if (in_array($role, Roles::MANAGEMENT) && $purchaseOrder->status === 'soumis') {
            abort_if(
                $purchaseOrder->requested_by !== $user->id,
                403,
                'Une commande soumise ne peut être modifiée que par son demandeur. Rejetez-la pour corrections.'
            );
        }

        $data = $request->validate([
            'supplier_id'           => ['nullable', Rule::exists('suppliers', 'id')->where('company_id', $user->company_id)],
            'project_id'            => ['nullable', Rule::exists('projects', 'id')->where('company_id', $user->company_id)],
            'items'                 => 'sometimes|array|min:1',
            'items.*.description'   => 'required_with:items|string|max:255',
            'items.*.quantity'      => 'required_with:items|numeric|min:0.01',
            'items.*.unit'          => 'required_with:items|string|max:30',
            'items.*.unit_price'    => 'required_with:items|numeric|min:0',
            'items.*.stock_item_id' => ['nullable', 'integer', Rule::exists('stock_items', 'id')->where('company_id', $user->company_id)],
            'expected_delivery'     => 'nullable|date',
            'notes'                 => 'nullable|string|max:1000',
        ]);

        if (isset($data['items'])) {
            $data['items'] = collect($data['items'])->map(fn($i) => [
                ...$i,
                'total' => round($i['quantity'] * $i['unit_price'], 2),
            ])->all();
            $data['total_amount'] = collect($data['items'])->sum('total');
        }

        $purchaseOrder->update($data);
        $purchaseOrder->load('supplier:id,name', 'project:id,name,code', 'requester:id,name', 'approver:id,name');

        return response()->json($purchaseOrder);
    }

    public function approve(Request $request, PurchaseOrder $purchaseOrder): JsonResponse
    {
        abort_if($purchaseOrder->company_id !== $request->user()->company_id, 403);
        $this->authorizeApprover($request);
        abort_if($purchaseOrder->status !== 'soumis', 422, 'Seuls les BDC soumis peuvent être approuvés.');
        // FIX H9: prevent self-approval
        abort_if(
            $purchaseOrder->requested_by === $request->user()->id,
            403,
            'Vous ne pouvez pas approuver votre propre commande.'
        );

        $purchaseOrder->update([
            'status'      => 'approuve',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
            'rejection_reason' => null,
        ]);

        event(new BdcApproved($purchaseOrder, $request->user()));

        $purchaseOrder->load('supplier:id,name', 'project:id,name,code', 'requester:id,name', 'approver:id,name');

        return response()->json($purchaseOrder);
    }

    public function reject(Request $request, PurchaseOrder $purchaseOrder): JsonResponse
    {
        abort_if($purchaseOrder->company_id !== $request->user()->company_id, 403);
        $this->authorizeApprover($request);
        abort_if($purchaseOrder->status !== 'soumis', 422, 'Seuls les BDC soumis peuvent être rejetés.');

        $request->validate(['reason' => 'required|string|max:500']);

        $purchaseOrder->update([
            'status'           => 'rejete',
            'approved_by'      => $request->user()->id,
            'rejection_reason' => $request->reason,
        ]);

        $purchaseOrder->load('supplier:id,name', 'project:id,name,code', 'requester:id,name', 'approver:id,name');

        return response()->json($purchaseOrder);
    }

    public function markReceived(Request $request, PurchaseOrder $purchaseOrder): JsonResponse
    {
        abort_if($purchaseOrder->company_id !== $request->user()->company_id, 403);
        abort_if($purchaseOrder->status !== 'approuve', 422, 'Seuls les BDC approuvés peuvent être marqués reçus.');
        abort_unless(
            in_array($request->user()->role->name, [...Roles::LOGISTICS, ...Roles::MANAGEMENT]),
            403,
            'Réception BDC réservée à la logistique.'
        );

        $request->validate([
            'delivery_note'   => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
            'photos'          => 'nullable|array|max:10',
            'photos.*'        => 'file|mimes:jpg,jpeg,png,webp|max:5120',
            'reception_notes' => 'nullable|string|max:1000',
        ]);

        abort_if(
            !$request->hasFile('delivery_note') && !$request->hasFile('photos'),
            422,
            'La réception doit être accompagnée d\'un bon de livraison ou d\'au moins une photo.'
        );

        $data = ['status' => 'recu', 'received_at' => now()];

        if ($request->hasFile('delivery_note')) {
            $file      = $request->file('delivery_note');
            $extension = strtolower($file->getClientOriginalExtension());
            $safeName  = now()->format('YmdHis') . '_' . \Str::uuid() . '.' . $extension;
            $blPath    = $file->storeAs("purchase-orders/{$purchaseOrder->id}/bl", $safeName, 'public');
            $data['delivery_note_path'] = $blPath;
        }

        if ($request->hasFile('photos')) {
            $paths = [];
            foreach ($request->file('photos') as $photo) {
                $extension = strtolower($photo->getClientOriginalExtension());
                $safeName  = now()->format('YmdHis') . '_' . \Str::uuid() . '.' . $extension;
                $paths[]   = $photo->storeAs("purchase-orders/{$purchaseOrder->id}/photos", $safeName, 'public');
            }
            $data['delivery_photos'] = $paths;
        }

        if ($request->filled('reception_notes')) {
            $data['reception_notes'] = $request->reception_notes;
        }

        // FIX C3: single outer transaction; createStockMovementsFromBdc() is now plain (no nested transaction)
        $movementsCreated = 0;
        DB::transaction(function () use ($purchaseOrder, $data, $request, &$movementsCreated) {
            // Verrou pessimiste : empêche double réception concurrente sur le même BDC
            $locked = PurchaseOrder::where('id', $purchaseOrder->id)->lockForUpdate()->first();
            abort_if($locked->status !== 'approuve', 422, 'Ce BDC a déjà été réceptionné ou son statut a changé.');

            $purchaseOrder->update($data);
            $movementsCreated = $this->createStockMovementsFromBdc($purchaseOrder, $request->user());
        });

        if ($movementsCreated === 0) {
            // Silent: BDC may have no stock-linked items — log but do not fail
            \Illuminate\Support\Facades\Log::info("markReceived: BDC #{$purchaseOrder->reference} — 0 stock movements created (items may have no stock_item_id).");
        }

        event(new BdcReceived($purchaseOrder->fresh(), $request->user()));

        $purchaseOrder->load('supplier:id,name', 'project:id,name,code', 'requester:id,name', 'approver:id,name');

        return response()->json($purchaseOrder);
    }

    public function deliveryDocs(Request $request, PurchaseOrder $purchaseOrder): JsonResponse
    {
        abort_if($purchaseOrder->company_id !== $request->user()->company_id, 403);

        $blUrl = $purchaseOrder->delivery_note_path
            ? Storage::disk('public')->url($purchaseOrder->delivery_note_path)
            : null;

        $photoUrls = collect($purchaseOrder->delivery_photos ?? [])->map(
            fn($p) => Storage::disk('public')->url($p)
        )->values()->all();

        return response()->json([
            'delivery_note_url' => $blUrl,
            'photo_urls'        => $photoUrls,
            'reception_notes'   => $purchaseOrder->reception_notes,
            'received_at'       => $purchaseOrder->received_at,
        ]);
    }

    public function destroy(Request $request, PurchaseOrder $purchaseOrder): Response
    {
        $user = $request->user();
        abort_if($purchaseOrder->company_id !== $user->company_id, 403);
        // FIX M7: also block deletion of rejected BDCs — use resubmit or cancel instead
        abort_if(
            in_array($purchaseOrder->status, ['approuve', 'recu', 'rejete']),
            422,
            'Impossible de supprimer un BDC approuvé, reçu ou rejeté. Utilisez resubmit ou cancel pour traiter ce rejet.'
        );

        abort_unless(
            $purchaseOrder->requested_by === $user->id
                || in_array($user->role->name, Roles::MANAGEMENT),
            403,
            'Seul le demandeur ou la direction peut supprimer ce BDC.'
        );

        $purchaseOrder->delete();
        return response()->noContent();
    }

    public function submit(Request $request, PurchaseOrder $purchaseOrder): JsonResponse
    {
        $user = $request->user();
        abort_if($purchaseOrder->company_id !== $user->company_id, 403);
        abort_unless($purchaseOrder->status === 'brouillon', 422, 'Seul un BDC en brouillon peut être soumis.');
        abort_unless(
            $purchaseOrder->requested_by === $user->id || in_array($user->role->name, Roles::MANAGEMENT, true),
            403,
            'Seul le créateur ou la direction peut soumettre ce BDC.'
        );

        $purchaseOrder->update(['status' => 'soumis']);

        return response()->json($purchaseOrder->load('supplier:id,name', 'project:id,name,code', 'requester:id,name'));
    }

    public function resubmit(Request $request, PurchaseOrder $purchaseOrder): JsonResponse
    {
        abort_if($purchaseOrder->company_id !== $request->user()->company_id, 403);
        abort_unless($purchaseOrder->status === 'rejete', 422, 'Seul un BDC rejeté peut être resoumis.');

        $user        = $request->user();
        $canResubmit = $purchaseOrder->requested_by === $user->id
            || in_array($user->role->name, Roles::MANAGEMENT);

        abort_unless($canResubmit, 403, 'Seul le demandeur original peut resoumettre.');

        $data = $request->validate(['correction_note' => 'nullable|string|max:500']);

        $purchaseOrder->update([
            'status'           => 'soumis',
            'rejection_reason' => null,
            'approved_by'      => null,
            'approved_at'      => null,
            // FIX M4: append correction_note rather than silently replace existing notes
            'notes'            => isset($data['correction_note']) && $data['correction_note'] !== null
                ? ($purchaseOrder->notes
                    ? $purchaseOrder->notes . "\n[Correction] " . $data['correction_note']
                    : $data['correction_note'])
                : $purchaseOrder->notes,
        ]);

        return response()->json($purchaseOrder->load('supplier:id,name', 'project:id,name,code'));
    }

    public function cancel(Request $request, PurchaseOrder $purchaseOrder): JsonResponse
    {
        abort_if($purchaseOrder->company_id !== $request->user()->company_id, 403);

        $user        = $request->user();
        $isDirection = in_array($user->role->name, Roles::MANAGEMENT, true);

        abort_if(
            ! in_array($purchaseOrder->status, ['brouillon', 'soumis', 'approuve'], true),
            422,
            'Seules les commandes en brouillon, soumises ou approuvées peuvent être annulées.'
        );

        // Annulation d'un BDC approuvé : direction uniquement + motif obligatoire
        $wasApproved = $purchaseOrder->status === 'approuve';

        if ($wasApproved) {
            abort_unless($isDirection, 403, "Annulation d'une commande approuvée réservée à la direction.");
            $data = $request->validate(['motif_annulation' => 'required|string|max:500']);
            $purchaseOrder->rejection_reason = $data['motif_annulation'];
            $purchaseOrder->save();
        } else {
            abort_unless(
                $purchaseOrder->requested_by === $user->id || $isDirection,
                403,
                'Seul le demandeur ou la direction peut annuler ce BDC.'
            );
        }

        $purchaseOrder->update(['status' => 'annule']);

        event(new BdcCancelled($purchaseOrder, $user, $wasApproved));

        return response()->json($purchaseOrder->load('supplier:id,name', 'project:id,name,code'));
    }

    /**
     * Create stock movements for all BDC items that have a stock_item_id.
     * FIX C3: no nested DB::transaction() — caller (markReceived) owns the outer transaction.
     * FIX L5: returns the number of movements actually created.
     */
    private function createStockMovementsFromBdc(PurchaseOrder $order, \App\Models\User $by): int
    {
        $items = is_array($order->items) ? $order->items : json_decode($order->items ?? '[]', true);
        if (empty($items)) {
            return 0;
        }

        $created = 0;

        foreach ($items as $item) {
            $qty         = (float) ($item['quantity'] ?? 0);
            $stockItemId = $item['stock_item_id'] ?? null;

            if ($qty <= 0 || !$stockItemId) {
                continue;
            }

            $stockItem = \App\Models\StockItem::where('id', $stockItemId)
                ->where('company_id', $order->company_id)
                ->first();

            if ($stockItem) {
                $stockItem->movements()->create([
                    'type'              => 'entree',
                    'quantity'          => $qty,
                    'reason'            => "Réception BDC #{$order->reference}",
                    'movement_date'     => now()->toDateString(),
                    'created_by'        => $by->id,
                    'purchase_order_id' => $order->id,
                ]);
                $stockItem->increment('quantity', $qty);
                $created++;
            }
        }

        return $created;
    }

    private function authorizeApprover(Request $request): void
    {
        abort_unless(
            in_array($request->user()->role->name, Roles::MANAGEMENT),
            403,
            'Seuls la Direction et le DT peuvent approuver les BDC.'
        );
    }
}
