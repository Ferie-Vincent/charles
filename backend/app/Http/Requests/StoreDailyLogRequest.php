<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreDailyLogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'weather' => ['required', 'in:Soleil,Nuageux,Pluie,Orage,Vent fort,Autre'],
            'workers_count' => ['required', 'integer', 'min:0'],
            'progress_percent' => ['required', 'numeric', 'min:0', 'max:100'],
            'has_incident' => ['boolean'],
            'incident_type' => ['nullable', 'required_if:has_incident,true', 'in:Retard,Accident,Litige,Rupture stock,Panne,RAS,Autre'],
            'equipment_status' => ['nullable', 'in:Bon,Moyen,Mauvais,Hors service'],
            'materials_received' => ['nullable', 'array'],
            'materials_received.*.name' => ['required_with:materials_received', 'string'],
            'materials_received.*.quantity' => ['required_with:materials_received', 'numeric', 'min:0'],
            'materials_received.*.unit' => ['nullable', 'string'],
        ];
    }
}
