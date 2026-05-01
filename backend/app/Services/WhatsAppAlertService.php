<?php

namespace App\Services;

use GuzzleHttp\Client;
use Illuminate\Support\Facades\Log;

class WhatsAppAlertService
{
    public function send(string $message, ?string $to = null): bool
    {
        $sid   = config('services.twilio.sid');
        $token = config('services.twilio.token');
        $from  = config('services.twilio.from');
        $to    = $to ?? config('services.twilio.to');

        if (! $sid || ! $token || ! $to) {
            Log::info('WhatsApp alert skipped — Twilio not configured.', ['message' => $message]);
            return false;
        }

        // Normalize: ensure whatsapp: prefix
        if (! str_starts_with($to, 'whatsapp:')) {
            $to = 'whatsapp:' . $to;
        }

        try {
            $client = new Client(['timeout' => 10]);
            $client->post(
                "https://api.twilio.com/2010-04-01/Accounts/{$sid}/Messages.json",
                [
                    'auth'        => [$sid, $token],
                    'form_params' => ['From' => $from, 'To' => $to, 'Body' => $message],
                ]
            );
            return true;
        } catch (\Throwable $e) {
            Log::error('WhatsApp alert failed', ['error' => $e->getMessage()]);
            return false;
        }
    }
}
