<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'code'            => ['sometimes', 'required', 'string', 'max:255'],
            'name'            => ['sometimes', 'required', 'string', 'max:255'],
            'status'          => ['sometimes', 'required', Rule::in(['draft', 'active', 'completed', 'archived'])],
            'location'        => ['sometimes', 'nullable', 'string', 'max:255'],
            'latitude'        => ['sometimes', 'nullable', 'numeric', 'between:-90,90'],
            'longitude'       => ['sometimes', 'nullable', 'numeric', 'between:-180,180'],
            'budget_amount'   => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'target_progress' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:100'],
            'start_date'      => ['sometimes', 'nullable', 'date'],
            'end_date'        => ['sometimes', 'nullable', 'date'],
        ];
    }
}
