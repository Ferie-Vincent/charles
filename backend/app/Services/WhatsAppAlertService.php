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
            Log::info('Alerte WhatsApp ignorée — Twilio non configuré.', ['message' => $message]);
            return false;
        }

        $to = $this->normalizePhone($to);

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

    private function normalizePhone(string $phone): string
    {
        // Supprime le préfixe whatsapp: — on le rajoutera après normalisation
        $raw = preg_replace('/^whatsapp:/i', '', trim($phone));

        // Déjà au format E.164
        if (str_starts_with($raw, '+')) {
            return 'whatsapp:' . $raw;
        }

        // 00225XXXXXXXXXX → +225XXXXXXXXXX
        if (str_starts_with($raw, '00225')) {
            return 'whatsapp:+' . substr($raw, 2);
        }

        // 225XXXXXXXXXX (+ manquant)
        if (str_starts_with($raw, '225') && strlen($raw) >= 11) {
            return 'whatsapp:+' . $raw;
        }

        // Local CI 0XXXXXXXXX (10 chiffres, préfixe réseau 0)
        if (str_starts_with($raw, '0') && strlen($raw) === 10) {
            return 'whatsapp:+225' . $raw;
        }

        // Fallback : ajouter + et espérer le meilleur
        return 'whatsapp:+' . $raw;
    }
}
