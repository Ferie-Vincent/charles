<?php

namespace App\Notifications;

use App\Models\MeetingInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class MeetingInvitedNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly MeetingInvitation $meeting) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'           => 'meeting_invitation',
            'meeting_id'     => $this->meeting->id,
            'title'          => $this->meeting->title,
            'scheduled_at'   => $this->meeting->scheduled_at->toIso8601String(),
            'project_id'     => $this->meeting->project_id,
            'project_name'   => $this->meeting->project->name ?? '',
            'organizer_name' => $this->meeting->organizer->name ?? '',
            'location'       => $this->meeting->location,
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $when = $this->meeting->scheduled_at->locale('fr')->isoFormat('dddd D MMMM YYYY [à] HH:mm');

        return (new MailMessage)
            ->subject("Invitation réunion — {$this->meeting->title}")
            ->greeting("Bonjour {$notifiable->name},")
            ->line("{$this->meeting->organizer->name} vous invite à une réunion chantier.")
            ->line("**{$this->meeting->title}**")
            ->line("📅 {$when}")
            ->when($this->meeting->location, fn($m) => $m->line("📍 {$this->meeting->location}"))
            ->when($this->meeting->notes, fn($m) => $m->line($this->meeting->notes))
            ->line("Connectez-vous à la plateforme pour consulter les détails.");
    }
}
