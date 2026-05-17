<?php

namespace App\Http\Controllers;

use App\Models\Avenant;
use App\Models\DecompteGeneralDefinitif;
use App\Models\Project;
use App\Models\SituationTravaux;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DgdController extends Controller
{
    public function show(Project $project): JsonResponse
    {
        $this->authorize('view', $project);
        $dgd = DecompteGeneralDefinitif::where('project_id', $project->id)->first();
        return response()->json(['dgd' => $dgd]);
    }

    public function initialize(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);
        abort_if(
            DecompteGeneralDefinitif::where('project_id', $project->id)->exists(),
            422,
            'Un DGD existe déjà pour ce projet.'
        );

        $montantInitial  = (float)($project->montant_marche ?? 0);
        $montantAvenants = Avenant::where('project_id', $project->id)
            ->where('status', 'signe')->sum('montant_ht');
        $totalSituations = SituationTravaux::where('project_id', $project->id)
            ->whereIn('status', ['validee_moe', 'payee'])->sum('montant_brut_ht');

        $penalites = 0;
        if ($project->end_date && $project->penalites_retard_par_jour) {
            $retard    = max(0, now()->diffInDays($project->end_date, false) * -1);
            $penalites = $retard * (float)$project->penalites_retard_par_jour;
        }

        $retenueGarantie = SituationTravaux::where('project_id', $project->id)
            ->sum('retenue_garantie_amount');

        $dgd = DecompteGeneralDefinitif::create([
            'project_id'               => $project->id,
            'company_id'               => $request->user()->company_id,
            'created_by'               => $request->user()->id,
            'montant_marche_initial'   => $montantInitial,
            'montant_avenants'         => $montantAvenants,
            'montant_marche_final'     => $montantInitial + $montantAvenants,
            'total_situations_ht'      => $totalSituations,
            'penalites_retard'         => $penalites,
            'retenue_garantie_liberee' => $retenueGarantie,
            'solde_final'              => $totalSituations - $penalites + $retenueGarantie,
            'status'                   => 'brouillon',
        ]);

        return response()->json(['dgd' => $dgd], 201);
    }

    public function sign(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);
        $dgd  = DecompteGeneralDefinitif::where('project_id', $project->id)->firstOrFail();

        $unsettled = SituationTravaux::where('project_id', $project->id)
            ->whereIn('status', ['en_revue_ct', 'en_revue_dt', 'soumise', 'contestee', 'validee_moe'])
            ->count();
        abort_if(
            $unsettled > 0,
            422,
            "DGD non signable : {$unsettled} situation(s) non soldée(s) en cours. Toutes les situations doivent être payées avant la signature du DGD."
        );

        $data = $request->validate([
            'signataire' => 'required|in:entreprise,moa',
            'date'       => 'required|date',
        ]);

        if ($data['signataire'] === 'entreprise') {
            $dgd->update(['status' => 'signe_entreprise', 'date_signature_entreprise' => $data['date']]);
        } else {
            $dgd->update(['status' => 'signe_moa', 'date_signature_moa' => $data['date']]);
            $project->update(['lifecycle_status' => 'cloture', 'status' => 'termine']);
        }

        return response()->json(['dgd' => $dgd]);
    }
}
