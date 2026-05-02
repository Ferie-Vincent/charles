<?php

namespace Database\Seeders;

use App\Models\DailyLog;
use App\Models\Project;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class DailyLogSeeder extends Seeder
{
    // Health tiers (HealthScoreService formula):
    // GREEN  ≥75 : on-track progress + dense logs + 0 incidents
    // ORANGE 50–74 : slight lag + moderate density + 1 incident
    // RED    <50  : big lag + sparse logs + 3–5 incidents
    private array $scenarios = [
        // code => [count, final_progress, incident_count]
        // ─── GREEN (~87–93) ─────────────────────────────────────────────
        'CH-PLAT-2025-001' => [300, 88, 0],   // Centre commercial
        'CH-MAN-2025-010'  => [200, 38, 0],   // Hôtel Man
        'CH-GHO-2025-006'  => [200, 59, 0],   // Résidence Grand-Bassam
        'CH-ABO-2025-003'  => [180, 75, 0],   // Clinique Abobo
        // ─── ORANGE (~55–62) ────────────────────────────────────────────
        'CH-YOP-2024-002'  => [100, 75,  1],  // Villa Yopougon
        'CH-SOB-2025-009'  => [ 80, 60,  1],  // Salle Soubré
        'CH-DLM-2025-005'  => [ 90, 65,  1],  // Lycée Daloa
        'CH-YMK-2025-001'  => [ 85, 70,  1],  // Résidence Yamoussoukro
        'CH-BKE-2025-001'  => [ 65, 60,  1],  // École Bouaké
        // ─── RED (~25–36) ───────────────────────────────────────────────
        'CH-SAN-2025-002'  => [  8, 15,  5],  // Entrepôt San Pédro
        'CH-KOR-2025-007'  => [  6, 10,  4],  // Centre santé Korhogo
        'CH-ABJ-2025-008'  => [  5,  5,  5],  // Station Adjamé
        'CH-MKD-2025-004'  => [ 12, 20,  3],  // Villa Marcory
    ];

    // target_progress per project (drives HealthScoreService planning_score)
    private array $targets = [
        'CH-PLAT-2025-001' => 88, 'CH-MAN-2025-010' => 37,
        'CH-GHO-2025-006'  => 58, 'CH-ABO-2025-003' => 74,
        'CH-YOP-2024-002'  => 90, 'CH-SOB-2025-009' => 75,
        'CH-DLM-2025-005'  => 80, 'CH-YMK-2025-001' => 85,
        'CH-BKE-2025-001'  => 75,
        'CH-SAN-2025-002'  => 100, 'CH-KOR-2025-007' => 100,
        'CH-ABJ-2025-008'  => 100, 'CH-MKD-2025-004' => 100,
    ];

    private array $weathers = ['Soleil', 'Soleil', 'Nuageux', 'Pluie', 'Soleil', 'Nuageux'];

    public function run(): void
    {
        $user = User::query()
            ->whereHas('role', fn ($q) => $q->where('name', 'direction'))
            ->firstOrFail();

        foreach ($this->scenarios as $code => [$count, $finalProgress, $incidentCount]) {
            $project = Project::query()->where('code', $code)->first();
            if (!$project) continue;

            // Update target_progress on the project
            $project->update(['target_progress' => $this->targets[$code]]);

            $daysSince = (int) Carbon::parse($project->start_date)->diffInDays(Carbon::today());
            if ($daysSince < 1) continue;

            // Build unique, sorted date list
            $dates = $this->buildDates($daysSince, $count);
            $total = count($dates);
            if ($total === 0) continue;

            // Evenly-spaced incident positions
            $incidentPositions = $this->incidentPositions($total, $incidentCount);

            foreach ($dates as $i => $date) {
                $pct        = $total > 1 ? (int) round($finalProgress * $i / ($total - 1)) : $finalProgress;
                $hasIncident = in_array($i, $incidentPositions);

                DailyLog::query()->updateOrCreate(
                    ['project_id' => $project->id, 'log_date' => $date],
                    [
                        'user_id'            => $user->id,
                        'weather'            => $this->weathers[$i % count($this->weathers)],
                        'workers_count'      => 5 + ($i % 20),
                        'progress_percent'   => $pct,
                        'has_incident'       => $hasIncident,
                        'incident_type'      => $hasIncident ? 'Retard' : null,
                        'equipment_status'   => $hasIncident ? 'Moyen' : 'Bon',
                        'materials_received' => [],
                    ]
                );
            }
        }
    }

    private function buildDates(int $daysSince, int $count): array
    {
        $count = min($count, $daysSince);
        $dates = [];

        if ($count >= $daysSince) {
            for ($i = $daysSince - 1; $i >= 0; $i--) {
                $dates[] = Carbon::today()->subDays($i)->toDateString();
            }
        } else {
            for ($i = 0; $i < $count; $i++) {
                $daysAgo = (int) round($daysSince - 1 - ($i * ($daysSince - 1) / ($count - 1)));
                $dates[]  = Carbon::today()->subDays(max(0, $daysAgo))->toDateString();
            }
            $dates = array_values(array_unique($dates));
            sort($dates);
        }

        return $dates;
    }

    private function incidentPositions(int $total, int $count): array
    {
        if ($count === 0 || $total === 0) return [];
        $positions = [];
        for ($i = 0; $i < $count; $i++) {
            $positions[] = (int) round($total * ($i + 1) / ($count + 1));
        }
        return $positions;
    }
}
