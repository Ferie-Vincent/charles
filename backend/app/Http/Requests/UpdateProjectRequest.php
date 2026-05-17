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
            'code'                      => ['sometimes', 'required', 'string', 'max:255'],
            'name'                      => ['sometimes', 'required', 'string', 'max:255'],
            'status'                    => ['sometimes', 'required', Rule::in(['en_preparation', 'active', 'completed', 'archived'])],
            'location'                  => ['sometimes', 'nullable', 'string', 'max:255'],
            'latitude'                  => ['sometimes', 'nullable', 'numeric', 'between:-90,90'],
            'longitude'                 => ['sometimes', 'nullable', 'numeric', 'between:-180,180'],
            'budget_amount'             => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'target_progress'           => ['sometimes', 'nullable', 'integer', 'min:0', 'max:100'],
            'start_date'                => ['sometimes', 'nullable', 'date'],
            'end_date'                  => ['sometimes', 'nullable', 'date'],
            // BTP contract fields
            'type_marche'               => ['sometimes', 'nullable', Rule::in(['forfait', 'bordereau_prix', 'depenses_controlees', 'cle_en_main'])],
            'maitre_ouvrage'            => ['sometimes', 'nullable', 'string', 'max:200'],
            'maitre_oeuvre'             => ['sometimes', 'nullable', 'string', 'max:200'],
            'bureau_controle'           => ['sometimes', 'nullable', 'string', 'max:200'],
            'montant_marche'            => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'avance_demarrage_pct'      => ['sometimes', 'nullable', 'integer', 'min:0', 'max:50'],
            'delai_execution_jours'     => ['sometimes', 'nullable', 'integer', 'min:1'],
            'date_reception_provisoire'   => ['sometimes', 'nullable', 'date'],
            'date_reception_definitive'   => ['sometimes', 'nullable', 'date'],
            // Execution contract fields — direction/DT only
            'lifecycle_status'            => ['sometimes', 'nullable', Rule::in(['ao', 'attribution', 'preparation', 'execution', 'reception', 'cloture'])],
            'caution_bonne_execution_pct' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:20'],
            'penalites_retard_par_jour'   => ['sometimes', 'nullable', 'numeric', 'min:0'],
        ];
    }
}
