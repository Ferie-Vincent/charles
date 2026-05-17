<?php

namespace App\Console\Commands;

use App\Models\MeetingInvitation;
use App\Services\WhatsAppAlertService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SendMeetingReminders extends Command
{
    protected $signature   = 'meetings:send-reminders';
    protected $description = 'Envoie des rappels WhatsApp 30 minutes avant les réunions';

    public function handle(WhatsAppAlertService $whatsapp): void
    {
        $windowStart = now()->addMinutes(25);
        $windowEnd   = now()->addMinutes(35);

        $meetings = MeetingInvitation::whereBetween('scheduled_at', [$windowStart, $windowEnd])
            ->where('reminder_sent', false)
            ->with(['project', 'organizer', 'invitees'])
            ->get();

        foreach ($meetings as $meeting) {
            $when = $meeting->scheduled_at->locale('fr')->isoFormat('HH:mm');

            $invitees = DB::table('meeting_invitation_users')
                ->join('users', 'users.id', '=', 'meeting_invitation_users.user_id')
                ->where('meeting_invitation_users.meeting_invitation_id', $meeting->id)
                ->whereNot('meeting_invitation_users.status', 'declined')
                ->whereNotNull('users.phone')
                ->select('users.name', 'users.phone')
                ->get();

            foreach ($invitees as $invitee) {
                $message = "⏰ *Rappel réunion dans 30 minutes*\n\n"
                    . "{$meeting->title}\n"
                    . "Projet : " . ($meeting->project->name ?? '') . "\n"
                    . "Heure : {$when}\n"
                    . ($meeting->location ? "Lieu : {$meeting->location}" : '');

                try {
                    $whatsapp->send($message, $invitee->phone);
                } catch (\Throwable $e) {
                    Log::warning('Meeting reminder failed', [
                        'meeting_id' => $meeting->id,
                        'phone'      => $invitee->phone,
                        'error'      => $e->getMessage(),
                    ]);
                }
            }

            // Marquer comme envoyé pour garantir l'idempotence entre les exécutions du planificateur
            $meeting->update(['reminder_sent' => true]);

            $this->info("Rappels envoyés pour la réunion #{$meeting->id} — {$invitees->count()} invité(s)");
        }
    }
}
