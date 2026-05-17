<?php

namespace App\Console\Commands;

use App\Models\Company;
use App\Models\Incident;
use App\Models\User;
use App\Notifications\MineurIncidentDigestNotification;
use App\Support\Roles;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('incidents:send-mineur-digest {--dry-run : Show digest without sending}')]
#[Description('Daily digest of mineur incidents sent to CT + DT at 18:00')]
class SendMineurIncidentDigest extends Command
{
    public function handle(): int
    {
        $today = now()->toDateString();

        $companies = Company::all();

        foreach ($companies as $company) {
            $incidents = Incident::whereHas('project', fn($q) => $q->where('company_id', $company->id))
                ->where('severity', 'mineur')
                ->whereDate('created_at', $today)
                ->with('project:id,name,code', 'reporter:id,name')
                ->get();

            if ($incidents->isEmpty()) continue;

            $this->line("Company #{$company->id}: {$incidents->count()} mineur incident(s) today");

            if ($this->option('dry-run')) continue;

            User::whereHas('role', fn($q) => $q->whereIn('name', [
                Roles::CONDUCTEUR_TRAVAUX_SLUG,
                Roles::DIRECTEUR_TECHNIQUE_SLUG,
            ]))
                ->where('company_id', $company->id)
                ->get()
                ->each(fn($u) => $u->notify(new MineurIncidentDigestNotification($incidents, $today)));
        }

        $this->info('Digest done.');
        return Command::SUCCESS;
    }
}
