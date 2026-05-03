<?php

namespace App\Http\Controllers;

use App\Models\GedDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class GedController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = GedDocument::where('company_id', $request->user()->company_id)
            ->with('project:id,name,code', 'uploader:id,name')
            ->orderByDesc('created_at');

        if ($request->filled('project_id')) {
            $query->where('project_id', $request->project_id);
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        $role = $request->user()->role->name;
        abort_unless(
            in_array($role, [
                'conducteur-travaux', 'chef-chantier', 'metreur-economiste',
                'comptable', 'moyens-generaux', 'direction', 'directeur-technique'
            ]),
            403,
            'Upload de documents non autorisé pour ce rôle.'
        );

        $request->validate([
            'file'        => 'required|file|mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png,webp,zip|max:51200', // 50 MB
            'type'        => 'required|in:plan,contrat,pv,rapport,facture,photo,autre,ao,os,marche',
            'project_id'  => ['nullable', Rule::exists('projects', 'id')->where('company_id', $request->user()->company_id)],
            'name'        => 'nullable|string|max:255',
            'description' => 'nullable|string|max:500',
        ]);

        $file         = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $name         = $request->filled('name') ? $request->name : pathinfo($originalName, PATHINFO_FILENAME);
        $extension    = strtolower($file->extension()); // uses finfo, not client name
        $storedName   = Str::uuid() . '.' . $extension;
        $directory    = "ged/{$request->user()->company_id}";

        $path = Storage::disk('public')->putFileAs($directory, $file, $storedName);

        $doc = GedDocument::create([
            'company_id'    => $request->user()->company_id,
            'project_id'    => $request->project_id,
            'uploaded_by'   => $request->user()->id,
            'name'          => $name,
            'original_name' => $originalName,
            'path'          => $path,
            'mime_type'     => $file->getMimeType(),
            'size_bytes'    => $file->getSize(),
            'type'          => $request->type,
            'description'   => $request->description,
        ]);

        $doc->load('project:id,name,code', 'uploader:id,name');

        return response()->json($doc, 201);
    }

    public function download(Request $request, GedDocument $gedDocument): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        abort_if($gedDocument->company_id !== $request->user()->company_id, 403);
        abort_unless(Storage::disk('public')->exists($gedDocument->path), 404);

        return Storage::disk('public')->download($gedDocument->path, $gedDocument->original_name);
    }

    public function url(Request $request, GedDocument $gedDocument): JsonResponse
    {
        abort_if($gedDocument->company_id !== $request->user()->company_id, 403);

        return response()->json([
            'url' => Storage::disk('public')->url($gedDocument->path),
        ]);
    }

    public function update(Request $request, GedDocument $gedDocument): JsonResponse
    {
        abort_if($gedDocument->company_id !== $request->user()->company_id, 403);

        $role = $request->user()->role->name;
        abort_unless(
            in_array($role, [
                'conducteur-travaux', 'chef-chantier', 'metreur-economiste',
                'comptable', 'moyens-generaux', 'direction', 'directeur-technique'
            ]),
            403,
            'Upload de documents non autorisé pour ce rôle.'
        );

        $data = $request->validate([
            'name'        => 'sometimes|string|max:255',
            'type'        => 'sometimes|in:plan,contrat,pv,rapport,facture,photo,autre,ao,os,marche',
            'project_id'  => ['nullable', Rule::exists('projects', 'id')->where('company_id', $request->user()->company_id)],
            'description' => 'nullable|string|max:500',
        ]);

        $gedDocument->update($data);
        $gedDocument->load('project:id,name,code', 'uploader:id,name');

        return response()->json($gedDocument);
    }

    public function destroy(Request $request, GedDocument $gedDocument): Response
    {
        abort_if($gedDocument->company_id !== $request->user()->company_id, 403);

        $isOwner    = $gedDocument->uploaded_by === $request->user()->id;
        $isDirection = in_array($request->user()->role->name, ['direction', 'directeur-technique']);
        abort_unless($isOwner || $isDirection, 403, 'Seul le créateur ou la direction peut supprimer ce document.');

        Storage::disk('public')->delete($gedDocument->path);
        $gedDocument->delete();

        return response()->noContent();
    }
}
