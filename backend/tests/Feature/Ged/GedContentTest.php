<?php

use App\Models\Company;
use App\Models\GedDocument;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('public');

    $this->company = Company::factory()->create();
    $role = Role::query()->first();
    $this->user = User::factory()->create([
        'company_id' => $this->company->id,
        'role_id'    => $role->id,
    ]);

    $this->mdContent = "# Rapport Situation\n\nAvancement : **45%**\n\nTotal : 12 000 000 XOF";

    Storage::disk('public')->put('ged/test/rapport.md', $this->mdContent);

    $this->doc = GedDocument::create([
        'company_id'    => $this->company->id,
        'uploaded_by'   => $this->user->id,
        'name'          => 'Rapport Situation 2026-05',
        'original_name' => 'rapport.md',
        'path'          => 'ged/test/rapport.md',
        'mime_type'     => 'text/markdown',
        'size_bytes'    => strlen($this->mdContent),
        'type'          => 'rapport',
    ]);
});

it('requires authentication', function () {
    $this->getJson("/api/ged/{$this->doc->id}/content")
        ->assertUnauthorized();
});

it('returns markdown content as plain text', function () {
    $response = $this->actingAs($this->user)
        ->getJson("/api/ged/{$this->doc->id}/content");

    $response->assertOk();
    expect($response->getContent())->toContain('Rapport Situation');
    expect($response->getContent())->toContain('45%');
});

it('returns 403 for document belonging to another company', function () {
    $otherCompany = Company::factory()->create();
    $otherRole    = Role::query()->first();
    $otherUser    = User::factory()->create([
        'company_id' => $otherCompany->id,
        'role_id'    => $otherRole->id,
    ]);
    $otherDoc = GedDocument::create([
        'company_id'    => $otherCompany->id,
        'uploaded_by'   => $otherUser->id,
        'name'          => 'Confidentiel',
        'original_name' => 'confidentiel.md',
        'path'          => 'ged/other/confidentiel.md',
        'mime_type'     => 'text/markdown',
        'size_bytes'    => 100,
        'type'          => 'rapport',
    ]);

    $this->actingAs($this->user)
        ->getJson("/api/ged/{$otherDoc->id}/content")
        ->assertForbidden();
});

it('returns 404 when file missing from disk', function () {
    $ghostDoc = GedDocument::create([
        'company_id'    => $this->company->id,
        'uploaded_by'   => $this->user->id,
        'name'          => 'Fichier perdu',
        'original_name' => 'perdu.md',
        'path'          => 'ged/test/nonexistent.md',
        'mime_type'     => 'text/markdown',
        'size_bytes'    => 0,
        'type'          => 'rapport',
    ]);

    $this->actingAs($this->user)
        ->getJson("/api/ged/{$ghostDoc->id}/content")
        ->assertNotFound();
});

it('content-type header is text/plain', function () {
    $response = $this->actingAs($this->user)
        ->getJson("/api/ged/{$this->doc->id}/content");

    $response->assertOk();
    expect($response->headers->get('Content-Type'))->toContain('text/plain');
});
