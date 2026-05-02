<?php

namespace App\Http\Controllers;

use App\Models\PurchaseOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class PurchaseOrderController extends Controller
{
    private const APPROVER_ROLES = ['direction', 'directeur-technique'];

    public function index(Request $request): JsonResponse
    {
        $orders = PurchaseOrder::where('company_id', $request->user()->company_id)
            ->with('supplier:id,name', 'project:id,name,code', 'requester:id,name', 'approver:id,name')
            ->orderByDesc('created_at')
            ->get();

        return response()->json($orders);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'supplier_id'       => 'nullable|exists:suppliers,id',
            'project_id'        => 'nullable|exists:projects,id',
            'items'             => 'required|array|min:1',
            'items.*.description' => 'required|string|max:255',
            'items.*.quantity'  => 'required|numeric|min:0.01',
            'items.*.unit'      => 'required|string|max:30',
            'items.*.unit_price'=> 'required|numeric|min:0',
            'expected_delivery' => 'nullable|date',
            'notes'             => 'nullable|string|max:1000',
        ]);

        $items = collect($data['items'])->map(fn($i) => [
            ...$i,
            'total' => round($i['quantity'] * $i['unit_price'], 2),
        ])->all();

        $total = collect($items)->sum('total');

        $order = PurchaseOrder::create([
            ...$data,
            'items'        => $items,
            'total_amount' => $total,
            'reference'    => $this->generateReference($request->user()->company_id),
            'company_id'   => $request->user()->company_id,
            'requested_by' => $request->user()->id,
            'status'       => 'soumis',
        ]);

        $order->load('supplier:id,name', 'project:id,name,code', 'requester:id,name');

        return response()->json($order, 201);
    }

    public function update(Request $request, PurchaseOrder $purchaseOrder): JsonResponse
    {
        abort_if($purchaseOrder->company_id !== $request->user()->company_id, 403);
        abort_if(!in_array($purchaseOrder->status, ['brouillon', 'soumis']), 422, 'Seuls les BDC brouillon ou soumis peuvent être modifiés.');

        $data = $request->validate([
            'supplier_id'         => 'nullable|exists:suppliers,id',
            'project_id'          => 'nullable|exists:projects,id',
            'items'               => 'sometimes|array|min:1',
            'items.*.description' => 'required_with:items|string|max:255',
            'items.*.quantity'    => 'required_with:items|numeric|min:0.01',
            'items.*.unit'        => 'required_with:items|string|max:30',
            'items.*.unit_price'  => 'required_with:items|numeric|min:0',
            'expected_delivery'   => 'nullable|date',
            'notes'               => 'nullable|string|max:1000',
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

        $purchaseOrder->update([
            'status'      => 'approuve',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
            'rejection_reason' => null,
        ]);

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

        $purchaseOrder->update(['status' => 'recu']);
        $purchaseOrder->load('supplier:id,name', 'project:id,name,code', 'requester:id,name', 'approver:id,name');

        return response()->json($purchaseOrder);
    }

    public function destroy(Request $request, PurchaseOrder $purchaseOrder): Response
    {
        abort_if($purchaseOrder->company_id !== $request->user()->company_id, 403);
        abort_if(in_array($purchaseOrder->status, ['approuve', 'recu']), 422, 'Impossible de supprimer un BDC approuvé ou reçu.');

        $purchaseOrder->delete();
        return response()->noContent();
    }

    private function generateReference(int $companyId): string
    {
        $year  = now()->year;
        $count = PurchaseOrder::where('company_id', $companyId)
            ->whereYear('created_at', $year)
            ->count() + 1;

        return sprintf('BDC-%d-%03d', $year, $count);
    }

    private function authorizeApprover(Request $request): void
    {
        abort_unless(
            in_array($request->user()->role->name, self::APPROVER_ROLES),
            403,
            'Seuls la Direction et le DT peuvent approuver les BDC.'
        );
    }
}
