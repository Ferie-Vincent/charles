<?php

namespace App\Http\Controllers;

use App\Models\Avenant;
use App\Models\DecompteGeneralDefinitif;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\SituationTravaux;
use App\Models\User;
use App\Notifications\DgdSigneNotification;
use App\Support\Roles;
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

        // Gap #11: DGD uniquement si réception ou clôture
        abort_unless(in_array($project->lifecycle_status, ['reception', 'cloture']), 422,
            "DGD non autorisé — chantier en phase « {$project->lifecycle_status} ». Passez en réception avant d'initialiser le DGD."
        );

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

        // Gap #3: utiliser date_reception_provisoire comme point d'arrêt des pénalités
        $penalites = 0;
        if ($project->end_date && $project->penalites_retard_par_jour) {
            $dateRef   = $project->date_reception_provisoire ?? now();
            $retard    = max(0, $dateRef->diffInDays($project->end_date, false) * -1);
            $penalites = $retard * (float)$project->penalites_retard_par_jour;
        }

        // Gap #4: retenue libérée = seulement sur situations payées
        $retenueGarantie = SituationTravaux::where('project_id', $project->id)
            ->where('status', 'payee')
            ->sum('retenue_garantie_amount');

        // Gap #10: déduire le reliquat d'avance non remboursée
        $avanceAccordee     = round($project->avance_demarrage_montant, 2);
        $avanceRemboursee   = (float) SituationTravaux::where('project_id', $project->id)
            ->where('status', 'payee')
            ->sum('avance_remboursement');
        $avanceRestante = max(0.0, $avanceAccordee - $avanceRemboursee);

        $dgd = DecompteGeneralDefinitif::create([
            'project_id'                   => $project->id,
            'company_id'                   => $request->user()->company_id,
            'created_by'                   => $request->user()->id,
            'montant_marche_initial'        => $montantInitial,
            'montant_avenants'              => $montantAvenants,
            'montant_marche_final'          => $montantInitial + $montantAvenants,
            'total_situations_ht'           => $totalSituations,
            'penalites_retard'              => $penalites,
            'retenue_garantie_liberee'      => $retenueGarantie,
            'avance_remboursement_restant'  => $avanceRestante,
            'solde_final'                   => $totalSituations - $penalites + $retenueGarantie - $avanceRestante,
            'status'                        => 'brouillon',
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
            // Gap #6: le MOA ne peut signer qu'après l'entreprise (ordre contractuel obligatoire)
            abort_unless($dgd->status === 'signe_entreprise', 422,
                "Le DGD doit être signé par l'entreprise avant la signature MOA."
            );
            $dgd->update(['status' => 'signe_moa', 'date_signature_moa' => $data['date']]);
            $project->update(['lifecycle_status' => 'cloture', 'status' => 'termine']);

            // Gap #13: notifier CDT + métreur + direction à la clôture financière
            $dgd->load('project:id,code,name,company_id');
            $memberIds = ProjectMember::where('project_id', $project->id)->pluck('user_id');
            User::whereHas('role', fn($q) => $q->whereIn('name', [
                Roles::CONDUCTEUR_TRAVAUX_SLUG,
                Roles::METREUR_ECONOMISTE_SLUG,
                Roles::DIRECTION_SLUG,
                Roles::DIRECTEUR_TECHNIQUE_SLUG,
            ]))
                ->where('company_id', $project->company_id)
                ->where('id', '!=', $request->user()->id)
                ->get()
                ->each(fn($u) => $u->notify(new DgdSigneNotification($dgd)));
        }

        return response()->json(['dgd' => $dgd]);
    }

    public function updateObservations(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);
        $dgd = DecompteGeneralDefinitif::where('project_id', $project->id)->firstOrFail();
        abort_if($dgd->status === 'signe_moa', 422, 'DGD clôturé — observations non modifiables.');
        $data = $request->validate(['observations' => 'nullable|string|max:2000']);
        $dgd->update(['observations' => $data['observations']]);
        return response()->json(['dgd' => $dgd]);
    }
}
