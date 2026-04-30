<?php

uses(Tests\TestCase::class, Illuminate\Foundation\Testing\RefreshDatabase::class)
    ->beforeEach(fn () => \Illuminate\Support\Facades\Artisan::call('db:seed', ['--class' => 'RoleSeeder']))
    ->in('Feature');
