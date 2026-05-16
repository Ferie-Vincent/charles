<?php

uses(Tests\TestCase::class, Illuminate\Foundation\Testing\RefreshDatabase::class)
    ->beforeEach(fn () => \Illuminate\Support\Facades\Artisan::call('db:seed', ['--class' => 'RoleSeeder']))
    ->in('Feature');

/**
 * Seed default role permissions for all companies currently in DB.
 * Call this after Company::factory()->create() in tests that hit
 * routes protected by the permission middleware.
 */
function seedPermissions(): void
{
    \Illuminate\Support\Facades\Artisan::call('db:seed', ['--class' => 'RolePermissionSeeder']);
}
