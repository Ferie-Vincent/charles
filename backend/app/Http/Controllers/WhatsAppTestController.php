<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\WhatsAppAlertService;
use Illuminate\Http\JsonResponse;

class WhatsAppTestController extends Controller
{
    public function test(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $configured = config('services.twilio.sid') && config('services.twilio.to');

        if (! $configured) {
            return response()->json([
                'ok'      => false,
                'message' => 'Twilio non configuré (TWILIO_ACCOUNT_SID / WHATSAPP_ALERT_TO manquants).',
            ]);
        }

        $msg  = "✅ *Test alerte Chantier Platform*\n"
              . "Chantier : {$project->name} ({$project->code})\n"
              . "Les alertes WhatsApp sont opérationnelles.";
        $sent = app(WhatsAppAlertService::class)->send($msg);

        return response()->json([
            'ok'      => $sent,
            'message' => $sent ? 'Message envoyé.' : 'Échec — voir logs Laravel.',
        ]);
    }
}
