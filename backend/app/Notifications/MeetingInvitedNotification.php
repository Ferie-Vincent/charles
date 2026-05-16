<?php

namespace App\Notifications;

use App\Models\MeetingInvitation;
use App\Services\WhatsAppAlertService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;

class MeetingInvitedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;
    public int $backoff = 30;

    public function __construct(
        private readonly MeetingInvitation $meeting,
        private readonly string $rsvpToken = '',
        private readonly string $alertMessage = '',
        private readonly string $alertType = '',
    ) {}

    public function via(object $notifiable): array
    {
        $channels = ['database', 'mail'];
        if (! empty($notifiable->phone)) {
            $channels[] = 'whatsapp_custom';
        } else {
            Log::info('MeetingInvitedNotification: WhatsApp skipped — no phone', [
                'meeting_id' => $this->meeting->id,
                'user_id'    => $notifiable->id,
            ]);
        }
        return $channels;
    }

    public function toWhatsappCustom(object $notifiable): void
    {
        $when = $this->meeting->scheduled_at->locale('fr')->isoFormat('ddd D MMM [à] HH:mm');
        $message = "📅 *Invitation réunion — {$this->meeting->title}*\n\n"
            . "Organisé par : {$this->meeting->organizer->name}\n"
            . "Projet : " . ($this->meeting->project->name ?? $this->meeting->project_id) . "\n"
            . "Quand : {$when}\n";

        if ($this->meeting->location) {
            $message .= "Lieu : {$this->meeting->location}\n";
        }
        if ($this->alertMessage) {
            $message .= "\nContexte : {$this->alertMessage}\n";
        }
        if ($this->rsvpToken) {
            $appUrl = config('app.url', 'http://localhost:8000');
            $message .= "\nConfirmer présence : {$appUrl}/api/meetings/rsvp/{$this->rsvpToken}/accepted";
        }

        app(WhatsAppAlertService::class)->send($message, $notifiable->phone);
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'          => 'meeting_invitation',
            'meeting_id'    => $this->meeting->id,
            'title'         => $this->meeting->title,
            'scheduled_at'  => $this->meeting->scheduled_at->toIso8601String(),
            'project_id'    => $this->meeting->project_id,
            'project_name'  => $this->meeting->project->name ?? '',
            'organizer_name'=> $this->meeting->organizer->name ?? '',
            'location'      => $this->meeting->location,
            'rsvp_token'    => $this->rsvpToken,
            'alert_message' => $this->alertMessage,
            'alert_type'    => $this->alertType,
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $when  = $this->meeting->scheduled_at->locale('fr')->isoFormat('dddd D MMMM YYYY [à] HH:mm');
        $appUrl = config('app.url', 'http://localhost:5173');

        $mail = (new MailMessage)
            ->subject("Invitation réunion — {$this->meeting->title}")
            ->greeting("Bonjour {$notifiable->name},")
            ->line("{$this->meeting->organizer->name} vous invite à une réunion chantier.");

        if ($this->alertMessage) {
            $mail->line("**Contexte :** {$this->alertMessage}");
        }

        $mail
            ->line("**{$this->meeting->title}**")
            ->line("📅 {$when}");

        if ($this->meeting->location) {
            $mail->line("📍 {$this->meeting->location}");
        }
        if ($this->meeting->notes) {
            $mail->line($this->meeting->notes);
        }

        // CTA principal : ouvrir l'app
        $mail->action('Voir dans l\'app', $appUrl . '/tasks');

        // RSVP tokenisés (sans login)
        if ($this->rsvpToken) {
            $mail
                ->line('---')
                ->line('**Confirmez votre présence :**')
                ->action('✓ Je confirme ma présence', url("/api/meetings/rsvp/{$this->rsvpToken}/accepted"))
                ->line('ou')
                ->action('✗ Je ne pourrai pas venir', url("/api/meetings/rsvp/{$this->rsvpToken}/declined"));
        }

        return $mail;
    }

    public function failed(\Throwable $e): void
    {
        Log::error('MeetingInvitedNotification failed', [
            'meeting_id' => $this->meeting->id,
            'error'      => $e->getMessage(),
        ]);
    }
}
