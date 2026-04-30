<?php

use Illuminate\Testing\Fluent\AssertableJson;

it('returns api health metadata', function () {
    $response = $this->getJson('/api/health');

    $response
        ->assertOk()
        ->assertJson(fn (AssertableJson $json) => $json
            ->where('status', 'ok')
            ->whereType('app', 'string')
            ->whereType('timestamp', 'string')
        );
});
