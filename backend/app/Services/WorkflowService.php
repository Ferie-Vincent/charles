<?php

namespace App\Services;

use App\Events\DqeValidated;
use App\Events\InvoiceValidated;
use App\Models\DqeVersion;
use App\Models\Invoice;
use App\Models\PurchaseOrder;
use App\Models\StockItem;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

class WorkflowService
{
    // =========================================================================
    // Invoice state machine
    // =========================================================================

    /**
     * Transitions autorisées : de → vers.
     */
    private const INVOICE_TRANSITIONS = [
        'brouillon' => ['soumise'],
        'soumise'   => ['validee', 'disputee'],
        'validee'   => ['payee', 'disputee'],
        'payee'     => [],
        'disputee'  => ['soumise'],  // correction après litige — réservé à la direction
    ];

    /** Rôles qui peuvent effectuer chaque transition cible. */
    private const INVOICE_ROLE_GATES = [
        'soumise'  => null,                                          // tout rôle sauf lecture-seule (sauf disputee→soumise, cas spécial)
        'validee'  => ['direction', 'directeur-technique'],          // validation = direction (comptable paie, ne valide pas)
        'payee'    => ['comptable'],                                 // paiement réservé au comptable uniquement
        'disputee' => ['direction', 'directeur-technique'],
    ];

    /**
     * Fait avancer une facture vers un nouvel état.
     *
     * @throws InvalidArgumentException si la transition n'est pas autorisée
     * @throws RuntimeException si l'user n'a pas le rôle requis
     */
    public function transitionInvoice(Invoice $invoice, string $to, User $by): void
    {
        $from = $invoice->status;

        $this->assertTransitionAllowed(
            entity: 'Invoice',
            from: $from,
            to: $to,
            map: self::INVOICE_TRANSITIONS
        );

        $roleSlug = $this->getRoleSlug($by);

        // disputee → soumise : résolution de litige, direction seulement
        if ($from === 'disputee' && $to === 'soumise') {
            if (! in_array($roleSlug, ['direction', 'directeur-technique'], true)) {
                throw new RuntimeException("Résolution de litige réservée à la direction.");
            }
        } else {
            $this->assertRoleGate($to, $roleSlug, self::INVOICE_ROLE_GATES, 'lecture-seule');
        }

        // Champs d'audit selon la destination.
        $updates = ['status' => $to];

        if ($to === 'validee') {
            $updates['validated_by'] = $by->id;
            $updates['validated_at'] = now();
        } elseif ($to === 'payee') {
            $updates['paid_by'] = $by->id;
            $updates['paid_at'] = now();
        }

        $invoice->update($updates);

        if ($to === 'validee') {
            event(new InvoiceValidated($invoice, $by));
        }
    }

    // =========================================================================
    // DQE state machine
    // =========================================================================

    private const DQE_TRANSITIONS = [
        'draft'     => ['validated'],
        'validated' => ['archived'],
        'archived'  => [],
    ];

    private const DQE_ROLE_GATES = [
        'validated' => ['metreur-economiste', 'conducteur-travaux', 'direction', 'directeur-technique'],
        'archived'  => ['direction', 'directeur-technique'],
    ];

    /**
     * Fait avancer une version DQE vers un nouvel état.
     */
    public function transitionDqe(DqeVersion $dqe, string $to, User $by): void
    {
        $this->assertTransitionAllowed(
            entity: 'DqeVersion',
            from: $dqe->status,
            to: $to,
            map: self::DQE_TRANSITIONS
        );

        $roleSlug = $this->getRoleSlug($by);
        $this->assertRoleGate($to, $roleSlug, self::DQE_ROLE_GATES);

        $dqe->update(['status' => $to]);

        if ($to === 'validated') {
            event(new DqeValidated($dqe->load('project'), $by));
        }
    }

    // =========================================================================
    // BDC (PurchaseOrder) state machine
    // =========================================================================

    private const BDC_TRANSITIONS = [
        'brouillon' => ['soumis', 'annule'],
        'soumis'    => ['approuve', 'rejete', 'annule'],
        'approuve'  => ['recu', 'annule'],                    // annulation exceptionnelle direction
        'rejete'    => ['soumis'],
        'recu'      => [],
        'annule'    => [],
    ];

    private const BDC_ROLE_GATES = [
        'soumis'   => null,                                   // tout rôle sauf lecture-seule
        'approuve' => ['direction', 'directeur-technique'],
        'rejete'   => ['direction', 'directeur-technique'],
        'recu'     => ['moyens-generaux', 'direction', 'directeur-technique'],
        'annule'   => ['direction', 'directeur-technique'],   // annulation — direction uniquement
    ];

    /**
     * Fait avancer un bon de commande vers un nouvel état.
     */
    public function transitionBdc(PurchaseOrder $bdc, string $to, User $by): void
    {
        $from     = $bdc->status;
        $roleSlug = $this->getRoleSlug($by);

        $this->assertTransitionAllowed(
            entity: 'PurchaseOrder',
            from: $from,
            to: $to,
            map: self::BDC_TRANSITIONS
        );

        // Cas spécial : rejete → soumis n'est permis qu'au créateur OU à direction/DT.
        if ($from === 'rejete' && $to === 'soumis') {
            $isCreator      = $bdc->requested_by === $by->id;
            $isDirectionOrDT = in_array($roleSlug, ['direction', 'directeur-technique'], true);

            if (! $isCreator && ! $isDirectionOrDT) {
                throw new RuntimeException(
                    "Seul le créateur du BDC ou la direction peut le resoumettre après rejet."
                );
            }
        } else {
            $this->assertRoleGate($to, $roleSlug, self::BDC_ROLE_GATES, 'lecture-seule');
        }

        // Validation métier pour le rejet et l'annulation.
        if (in_array($to, ['rejete', 'annule'], true)) {
            $reason = $bdc->rejection_reason ?? '';
            if (trim($reason) === '') {
                $label = $to === 'rejete' ? 'rejeter' : 'annuler';
                throw new InvalidArgumentException(
                    "Le champ rejection_reason est obligatoire pour {$label} un BDC."
                );
            }
        }

        $updates = ['status' => $to];

        if ($to === 'approuve') {
            $updates['approved_by'] = $by->id;
            $updates['approved_at'] = now();
        }

        $bdc->update($updates);

        // Déclenchement des mouvements de stock à la réception.
        if ($to === 'recu') {
            $this->createStockMovements($bdc, $by);
        }
    }

    // =========================================================================
    // Internals
    // =========================================================================

    /**
     * Crée des mouvements de stock pour chaque ligne du BDC ayant un stock_item_id.
     */
    private function createStockMovements(PurchaseOrder $bdc, User $by): void
    {
        $items = $bdc->items ?? [];

        if (empty($items)) {
            return;
        }

        DB::transaction(function () use ($bdc, $by, $items): void {
            foreach ($items as $item) {
                $stockItemId = $item['stock_item_id'] ?? null;
                $quantity    = (float) ($item['quantity'] ?? 0);

                if ($stockItemId === null || $quantity <= 0) {
                    continue;
                }

                $stockItem = StockItem::find($stockItemId);

                if ($stockItem === null) {
                    continue;
                }

                StockMovement::create([
                    'stock_item_id'     => $stockItemId,
                    'created_by'        => $by->id,
                    'project_id'        => $bdc->project_id,
                    'purchase_order_id' => $bdc->id,
                    'type'              => 'entree',
                    'quantity'          => $quantity,
                    'reason'            => "Réception BDC #{$bdc->reference}",
                    'movement_date'     => now()->toDateString(),
                    'notes'             => $item['description'] ?? null,
                ]);

                // Incrémente le stock physique de manière atomique.
                $stockItem->increment('quantity', $quantity);
            }
        });
    }

    /**
     * Vérifie qu'une transition est dans la map des transitions autorisées.
     *
     * @param  array<string, string[]>  $map
     *
     * @throws InvalidArgumentException
     */
    private function assertTransitionAllowed(
        string $entity,
        string $from,
        string $to,
        array $map
    ): void {
        $allowed = $map[$from] ?? null;

        if ($allowed === null) {
            throw new InvalidArgumentException(
                "{$entity} : état source inconnu « {$from} »."
            );
        }

        if (! in_array($to, $allowed, true)) {
            throw new InvalidArgumentException(
                "{$entity} : transition de « {$from} » vers « {$to} » non autorisée."
                . (count($allowed) > 0
                    ? ' Transitions possibles : ' . implode(', ', $allowed) . '.'
                    : ' Aucune transition possible depuis cet état.')
            );
        }
    }

    /**
     * Vérifie que le rôle de l'utilisateur satisfait la gate associée à l'état cible.
     *
     * @param  array<string, string[]|null>  $gates
     *
     * @throws RuntimeException
     */
    private function assertRoleGate(
        string $to,
        string $roleSlug,
        array $gates,
        string $blocked = ''
    ): void {
        $allowedRoles = $gates[$to] ?? null;

        // null → tout rôle est autorisé (sauf le rôle bloqué explicitement).
        if ($allowedRoles === null) {
            if ($blocked !== '' && $roleSlug === $blocked) {
                throw new RuntimeException(
                    "Le rôle « {$roleSlug} » n'est pas autorisé à effectuer cette transition."
                );
            }

            return;
        }

        if (! in_array($roleSlug, $allowedRoles, true)) {
            throw new RuntimeException(
                "Le rôle « {$roleSlug} » n'est pas autorisé à passer vers l'état « {$to} »."
            );
        }
    }

    /**
     * Retourne le slug du rôle de l'user (charge la relation si non chargée).
     */
    private function getRoleSlug(User $user): string
    {
        if ($user->relationLoaded('role') && $user->role !== null) {
            return $user->role->name;
        }

        return $user->role()->value('name') ?? '';
    }
}
