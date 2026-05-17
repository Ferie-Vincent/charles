<?php

namespace Database\Seeders;

use App\Models\DailyLog;
use App\Models\Project;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class DailyLogSeeder extends Seeder
{
    // code => [log_count, final_progress, incident_count]
    private array $scenarios = [
        'CH-ANGRE-2024-001' => [210, 72, 1],
        'CH-KOU-2023-001'   => [180, 71, 1],
        'CH-BKE-2023-002'   => [140, 51, 2],
        'CH-YOP-2024-002'   => [250, 73, 2],
        'CH-PLAT-2025-001'  => [290, 58, 1],
        'CH-BKE-2025-001'   => [190, 66, 1],
        'CH-YMK-2025-001'   => [200, 65, 1],
        'CH-SAN-2025-002'   => [195, 63, 2],
        'CH-ABO-2025-003'   => [160, 47, 2],
        'CH-MKD-2025-004'   => [175, 61, 1],
        'CH-DLM-2025-005'   => [185, 68, 1],
        'CH-GHO-2025-006'   => [205, 42, 3],
        'CH-KOR-2025-007'   => [175, 70, 2],
        'CH-ABJ-2025-008'   => [145, 60, 2],
        'CH-SOB-2025-009'   => [160, 55, 1],
        'CH-MAN-2025-010'   => [100, 23, 1],
        'CH-ABJ-2025-011'   => [ 90, 40, 1],
        'CH-ABJ-2026-001'   => [ 35,  9, 0],
        'CH-ABJ-2026-002'   => [ 15,  5, 0],
        'CH-GGN-2026-001'   => [  5,  1, 0],
    ];

    private array $weathers = ['Soleil', 'Soleil', 'Nuageux', 'Pluie', 'Soleil', 'Nuageux', 'Soleil'];

    private array $materials = [
        ['name' => 'Ciment', 'qty' => 50],
        ['name' => 'Fer', 'qty' => 2],
        ['name' => 'Sable', 'qty' => 10],
        ['name' => 'Gravier', 'qty' => 8],
        ['name' => 'Briques', 'qty' => 200],
    ];

    public function run(): void
    {
        $user = User::query()
            ->whereHas('role', fn ($q) => $q->where('name', 'direction'))
            ->firstOrFail();

        $chef = User::query()
            ->whereHas('role', fn ($q) => $q->where('name', 'chef-chantier'))
            ->first() ?? $user;

        foreach ($this->scenarios as $code => [$count, $finalProgress, $incidentCount]) {
            $project = Project::query()->where('code', $code)->first();
            if (! $project) continue;

            $daysSince = (int) Carbon::parse($project->start_date)->diffInDays(Carbon::today());
            if ($daysSince < 1) continue;

            $dates              = $this->buildDates($daysSince, $count);
            $total              = count($dates);
            if ($total === 0) continue;

            $incidentPositions  = $this->incidentPositions($total, $incidentCount);
            $logUser            = ($code === 'CH-ANGRE-2024-001' || str_contains($code, 'PLAT')) ? $user : $chef;

            foreach ($dates as $i => $date) {
                $pct        = $total > 1 ? (int) round($finalProgress * $i / ($total - 1)) : $finalProgress;
                $hasIncident = in_array($i, $incidentPositions);
                $mats       = ($i % 7 === 0) ? [
                    $this->materials[$i % count($this->materials)],
                ] : [];

                DailyLog::query()->updateOrCreate(
                    ['project_id' => $project->id, 'log_date' => $date],
                    [
                        'user_id'            => $logUser->id,
                        'weather'            => $this->weathers[$i % count($this->weathers)],
                        'workers_count'      => 8 + ($i % 22),
                        'progress_percent'   => $pct,
                        'has_incident'       => $hasIncident,
                        'incident_type'      => $hasIncident ? 'Retard' : null,
                        'equipment_status'   => $hasIncident ? 'Moyen' : 'Bon',
                        'materials_received' => $mats,
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
                $dates[] = Carbon::today()->subDays(max(0, $daysAgo))->toDateString();
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
