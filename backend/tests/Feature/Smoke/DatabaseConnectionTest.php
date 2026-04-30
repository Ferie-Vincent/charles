<?php

use Illuminate\Support\Facades\DB;

it('connects to the configured database', function () {
    expect(DB::select('select 1 as result')[0]->result)->toBe(1);
});
