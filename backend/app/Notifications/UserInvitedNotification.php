<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class UserInvitedNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly string $invitationUrl,
        private readonly string $inviterName,
        private readonly string $platformName = 'Charles — Gestion Chantiers',
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("Invitation — {$this->platformName}")
            ->greeting("Bonjour {$notifiable->name},")
            ->line("{$this->inviterName} vous invite à rejoindre la plateforme {$this->platformName}.")
            ->action('Définir mon mot de passe', $this->invitationUrl)
            ->line('Ce lien expire dans **7 jours**.')
            ->line("Si vous n'attendiez pas cette invitation, ignorez cet email.");
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'           => 'invitation',
            'invitation_url' => $this->invitationUrl,
            'inviter'        => $this->inviterName,
        ];
    }
}
