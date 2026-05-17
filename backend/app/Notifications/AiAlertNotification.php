<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

class AiAlertNotification extends Notification
{
    public function __construct(private readonly array $alert) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'         => 'ai_alert',
            'alert_type'   => $this->alert['type'],
            'project_id'   => $this->alert['project_id'],
            'project_name' => $this->alert['project_name'],
            'message'      => $this->alert['message'],
            'severity'     => $this->alert['severity'],
        ];
    }
}
