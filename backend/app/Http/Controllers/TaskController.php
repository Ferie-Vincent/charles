<?php

namespace App\Http\Controllers;

use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class TaskController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tasks = Task::where('company_id', $request->user()->company_id)
            ->with('assignee:id,name', 'creator:id,name', 'meeting:id,task_id')
            ->orderByRaw("FIELD(priority,'urgent','high','normal')")
            ->orderByDesc('created_at')
            ->get()
            ->map(fn($t) => array_merge($t->toArray(), [
                'meeting_id' => $t->meeting?->id,
            ]));

        return response()->json($tasks);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'tasks'               => 'required|array|min:1',
            'tasks.*.title'       => 'required|string|max:255',
            'tasks.*.detail'      => 'nullable|string|max:1000',
            'tasks.*.priority'    => 'required|in:urgent,high,normal',
            'tasks.*.role_target' => 'nullable|string|max:60',
            'tasks.*.project_code'=> 'nullable|string|max:30',
            'tasks.*.assigned_to' => 'nullable|exists:users,id',
            'tasks.*.source'      => 'nullable|in:ai,manual',
            'tasks.*.due_date'    => 'nullable|date',
        ]);

        $created = collect($data['tasks'])->map(fn($t) => Task::create([
            ...$t,
            'assigned_by' => $request->user()->id,
            'company_id'  => $request->user()->company_id,
            'source'      => $t['source'] ?? 'manual',
            'status'      => 'todo',
        ]))->map(fn($task) => $task->load('assignee:id,name', 'creator:id,name'));

        return response()->json($created, 201);
    }

    public function update(Request $request, Task $task): JsonResponse
    {
        abort_if($task->company_id !== $request->user()->company_id, 403);

        $data = $request->validate([
            'status'      => 'sometimes|in:todo,in_progress,blocked,done,cancelled',
            'assigned_to' => 'sometimes|nullable|exists:users,id',
            'due_date'    => 'sometimes|nullable|date',
        ]);

        $task->update($data);
        $task->load('assignee:id,name', 'creator:id,name');

        return response()->json($task);
    }

    public function destroy(Request $request, Task $task): Response
    {
        abort_if($task->company_id !== $request->user()->company_id, 403);
        $task->delete();
        return response()->noContent();
    }
}
