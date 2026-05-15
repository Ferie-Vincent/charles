<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MeetingMetricsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $companyId = $request->user()->company_id;

        // ── Taux de réponse RSVP ──────────────────────────────────────────────
        $rsvp = DB::table('meeting_invitation_users as miu')
            ->join('meeting_invitations as mi', 'mi.id', '=', 'miu.meeting_invitation_id')
            ->where('mi.company_id', $companyId)
            ->selectRaw('
                COUNT(*) as total,
                SUM(miu.status = "accepted") as accepted,
                SUM(miu.status = "declined") as declined,
                SUM(miu.status = "invited")  as pending
            ')
            ->first();

        $rsvpTotal    = (int) $rsvp->total;
        $rsvpAnswered = (int) $rsvp->accepted + (int) $rsvp->declined;
        $rsvpRate     = $rsvpTotal > 0 ? round($rsvpAnswered / $rsvpTotal * 100, 1) : 0;
        $acceptRate   = $rsvpAnswered > 0 ? round((int) $rsvp->accepted / $rsvpAnswered * 100, 1) : 0;

        // ── Couverture canal WhatsApp vs Mail ─────────────────────────────────
        // Proxy: invitees qui avaient un numéro au moment de l'invitation
        $channels = DB::table('meeting_invitation_users as miu')
            ->join('meeting_invitations as mi', 'mi.id', '=', 'miu.meeting_invitation_id')
            ->join('users', 'users.id', '=', 'miu.user_id')
            ->where('mi.company_id', $companyId)
            ->selectRaw('
                COUNT(*) as total,
                SUM(users.phone IS NOT NULL) as whatsapp,
                SUM(users.phone IS NULL)     as mail_only
            ')
            ->first();

        $chanTotal  = (int) $channels->total;
        $waRate     = $chanTotal > 0 ? round((int) $channels->whatsapp / $chanTotal * 100, 1) : 0;

        // ── Taux de complétion des checklists ─────────────────────────────────
        // Tasks source=ai avec alert_key → générées depuis une réunion + checklist
        $checklists = DB::table('tasks')
            ->where('company_id', $companyId)
            ->where('source', 'ai')
            ->whereNotNull('alert_key')
            ->selectRaw('
                COUNT(*) as total,
                SUM(status = "done") as done
            ')
            ->first();

        $clTotal        = (int) $checklists->total;
        $clDone         = (int) $checklists->done;
        $checklistRate  = $clTotal > 0 ? round($clDone / $clTotal * 100, 1) : 0;

        return response()->json([
            'rsvp' => [
                'total'       => $rsvpTotal,
                'answered'    => $rsvpAnswered,
                'pending'     => (int) $rsvp->pending,
                'accepted'    => (int) $rsvp->accepted,
                'declined'    => (int) $rsvp->declined,
                'response_rate_pct' => $rsvpRate,
                'accept_rate_pct'   => $acceptRate,
            ],
            'channels' => [
                'total'          => $chanTotal,
                'whatsapp'       => (int) $channels->whatsapp,
                'mail_only'      => (int) $channels->mail_only,
                'whatsapp_rate_pct' => $waRate,
            ],
            'checklists' => [
                'total'           => $clTotal,
                'done'            => $clDone,
                'completion_rate_pct' => $checklistRate,
                'below_threshold' => $checklistRate < 20,
            ],
        ]);
    }
}
