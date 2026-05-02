<?php

use App\Services\WhatsAppAlertService;

describe('WhatsAppAlertService::normalizePhone', function () {
    function normalize(string $phone): string
    {
        $service = new WhatsAppAlertService();
        $ref = new ReflectionMethod($service, 'normalizePhone');
        return $ref->invoke($service, $phone);
    }

    it('keeps already-valid E.164 unchanged', function () {
        expect(normalize('+2250701234567'))->toBe('whatsapp:+2250701234567');
    });

    it('converts CI local format (0XXXXXXXXX) to E.164', function () {
        expect(normalize('0701234567'))->toBe('whatsapp:+2250701234567');
    });

    it('handles 00225 prefix', function () {
        expect(normalize('002250701234567'))->toBe('whatsapp:+2250701234567');
    });

    it('handles 225 prefix without +', function () {
        expect(normalize('2250701234567'))->toBe('whatsapp:+2250701234567');
    });

    it('strips existing whatsapp: prefix before re-normalizing', function () {
        expect(normalize('whatsapp:+2250701234567'))->toBe('whatsapp:+2250701234567');
        expect(normalize('whatsapp:0701234567'))->toBe('whatsapp:+2250701234567');
    });
});
