<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'code'                      => ['required', 'string', 'max:255'],
            'name'                      => ['required', 'string', 'max:255'],
            'status'                    => ['required', Rule::in(['en_preparation', 'active'])],
            'location'                  => ['nullable', 'string', 'max:255'],
            'budget_amount'             => ['nullable', 'numeric', 'min:0'],
            'start_date'                => ['nullable', 'date'],
            'end_date'                  => ['nullable', 'date', 'after_or_equal:start_date'],
            // BTP contract fields
            'type_marche'               => ['nullable', Rule::in(['forfait', 'bordereau_prix', 'depenses_controlees', 'cle_en_main'])],
            'maitre_ouvrage'            => ['nullable', 'string', 'max:200'],
            'maitre_oeuvre'             => ['nullable', 'string', 'max:200'],
            'bureau_controle'           => ['nullable', 'string', 'max:200'],
            'montant_marche'            => ['nullable', 'numeric', 'min:0'],
            'avance_demarrage_pct'      => ['nullable', 'integer', 'min:0', 'max:50'],
            'delai_execution_jours'     => ['nullable', 'integer', 'min:1'],
            'date_reception_provisoire' => ['nullable', 'date'],
            'date_reception_definitive' => ['nullable', 'date'],
        ];
    }
}
