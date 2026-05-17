<?php

namespace App\Notifications;

use App\Models\PurchaseOrder;
use App\Models\User;
use Illuminate\Notifications\Notification;

class BdcStatusChangedNotification extends Notification
{
    public function __construct(
        private readonly PurchaseOrder $bdc,
        private readonly string $newStatus,
        private readonly User $actor,
        private readonly ?string $reason = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'        => 'bdc_status_changed',
            'bdc_status'  => $this->newStatus,
            'bdc_id'      => $this->bdc->id,
            'reference'   => $this->bdc->reference,
            'project_id'  => $this->bdc->project_id,
            'project_name'=> $this->bdc->project?->name,
            'actor_name'  => $this->actor->name,
            'reason'      => $this->reason,
        ];
    }
}
