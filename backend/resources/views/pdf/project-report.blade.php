<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'DejaVu Sans', sans-serif; font-size: 10px; color: #1e293b; line-height: 1.5; }

/* ── Cover header ── */
.cover {
  background: #111828;
  color: #fff;
  padding: 20px 32px 24px;
}
.cover__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 22px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.cover__logo-wrap { display: flex; align-items: center; gap: 12px; }
.cover__logo { height: 36px; width: auto; }
.cover__brand-name { font-size: 14px; font-weight: 700; color: #fff; }
.cover__brand-sub  { font-size: 9px; color: #78CDD4; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }
.cover__meta { text-align: right; }
.cover__meta-date   { font-size: 11px; font-weight: 700; color: #78CDD4; }
.cover__meta-time   { font-size: 9px; color: rgba(255,255,255,0.45); margin-top: 2px; }
.cover__title       { font-size: 22px; font-weight: 800; margin-bottom: 4px; letter-spacing: -0.3px; }
.cover__sub         { font-size: 12px; color: rgba(255,255,255,0.55); margin-bottom: 16px; }
.cover__chips       { display: flex; gap: 8px; flex-wrap: wrap; }
.chip               { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); border-radius: 4px; padding: 3px 10px; font-size: 9px; color: rgba(255,255,255,0.7); }
.chip--code         { background: #2F60B0; border-color: #2F60B0; font-weight: 800; color: #fff; font-family: 'DejaVu Sans Mono', monospace; }
.chip--status       { background: #10b981; border-color: #10b981; font-weight: 700; color: #fff; }

/* Accent line */
.accent-line { height: 3px; background: linear-gradient(90deg, #78CDD4 0%, #2F60B0 100%); }

/* ── Health band ── */
.health-band { padding: 12px 32px; display: flex; align-items: center; gap: 20px; }
.health-band--good     { background: #d1fae5; }
.health-band--warning  { background: #fef3c7; }
.health-band--critical { background: #fee2e2; }
.health-score { font-size: 30px; font-weight: 900; }
.health-band--good     .health-score { color: #059669; }
.health-band--warning  .health-score { color: #d97706; }
.health-band--critical .health-score { color: #dc2626; }
.health-label { font-size: 11px; font-weight: 700; color: #1e293b; }
.health-sub   { font-size: 9px; color: #6b7280; }
.health-breakdown { display: flex; gap: 18px; margin-left: auto; }
.hb-item { text-align: center; }
.hb-item .val { font-size: 15px; font-weight: 800; color: #1e293b; display: block; }
.hb-item .lbl { font-size: 8px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.3px; }

/* ── Body ── */
.body { padding: 22px 32px; }

/* ── Section ── */
.section { margin-bottom: 20px; }
.section-title {
  font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;
  color: #2F60B0; border-bottom: 2px solid #D8E8F8; padding-bottom: 4px; margin-bottom: 12px;
}

/* ── KPI grid ── */
.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.kpi-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; }
.kpi-box label { font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; display: block; margin-bottom: 3px; }
.kpi-box .val  { font-size: 17px; font-weight: 900; }
.kpi-box .hint { font-size: 8px; color: #94a3b8; margin-top: 2px; }
.bar-wrap { height: 4px; background: #e2e8f0; border-radius: 2px; margin-top: 5px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 2px; }

/* ── Budget ── */
.budget-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 12px; }
.bud-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; }
.bud-box label { font-size: 8px; text-transform: uppercase; color: #94a3b8; display: block; margin-bottom: 2px; }
.bud-box .val  { font-size: 13px; font-weight: 700; }
.bud-box--prev .val { color: #2F60B0; }
.bud-box--eng  .val { color: #f59e0b; }
.bud-box--pay  .val { color: #10b981; }
.bud-box--sol  .val { color: #8b5cf6; }

/* ── Table ── */
table { width: 100%; border-collapse: collapse; font-size: 9px; }
th { background: #EEF4FB; padding: 5px 8px; text-align: left; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; color: #2F60B0; font-size: 8px; }
td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; }
tr:last-child td { border-bottom: none; }
tr:nth-child(even) td { background: #f8fafc; }

.badge { display: inline-block; padding: 1px 5px; border-radius: 3px; font-size: 8px; font-weight: 700; }
.badge--ouvert   { background: #fee2e2; color: #dc2626; }
.badge--en_cours { background: #fef3c7; color: #d97706; }
.badge--resolu   { background: #d1fae5; color: #059669; }
.badge--ferme    { background: #f1f5f9; color: #6b7280; }
.badge--mineur   { background: #dbeafe; color: #1d4ed8; }
.badge--majeur   { background: #fef3c7; color: #92400e; }
.badge--critique { background: #fee2e2; color: #991b1b; }

/* ── Progress bar inline ── */
.prog-cell { display: flex; align-items: center; gap: 6px; }
.prog-bar  { flex: 1; height: 5px; background: #e2e8f0; border-radius: 3px; overflow: hidden; max-width: 80px; }
.prog-fill { height: 100%; background: #2F60B0; border-radius: 3px; }

/* ── Team ── */
.team-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.team-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; }
.team-card .name  { font-weight: 700; font-size: 10px; margin-bottom: 2px; }
.team-card .role  { font-size: 8px; color: #2F60B0; font-weight: 600; }
.team-card .email { font-size: 8px; color: #94a3b8; }

/* ── Footer ── */
.footer {
  border-top: 1px solid #e2e8f0;
  padding: 10px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 8px;
  color: #94a3b8;
  margin-top: 24px;
}
.footer__brand { font-weight: 700; color: #2F60B0; }
</style>
</head>
<body>

{{-- ── Cover ── --}}
<div class="cover">
  <div class="cover__top">
    <div class="cover__logo-wrap">
      <img class="cover__logo"
           src="data:image/png;base64,{{ base64_encode(file_get_contents(public_path('images/charles.png'))) }}"
           alt="Charles" />
      <div>
        <div class="cover__brand-name">Charles</div>
        <div class="cover__brand-sub">Rapport de chantier</div>
      </div>
    </div>
    <div class="cover__meta">
      <div class="cover__meta-date">{{ now()->format('d/m/Y') }}</div>
      <div class="cover__meta-time">Généré à {{ now()->format('H:i') }}</div>
    </div>
  </div>
  <div class="cover__title">{{ $project->name }}</div>
  <div class="cover__sub">{{ $project->location }}</div>
  <div class="cover__chips">
    <span class="chip chip--code">{{ $project->code }}</span>
    <span class="chip chip--status">{{ strtoupper($project->status) }}</span>
    @if($project->start_date)
    <span class="chip">Début {{ \Carbon\Carbon::parse($project->start_date)->format('d/m/Y') }}</span>
    @endif
    @if($project->end_date)
    <span class="chip">Fin prévue {{ \Carbon\Carbon::parse($project->end_date)->format('d/m/Y') }}</span>
    @endif
    @if($project->budget_amount)
    <span class="chip">Budget {{ number_format($project->budget_amount / 1_000_000, 0, ',', ' ') }} M FCFA</span>
    @endif
  </div>
</div>
<div class="accent-line"></div>

{{-- ── Health score band ── --}}
<div class="health-band health-band--{{ $healthScore['label'] }}">
  <div>
    <div class="health-score">{{ $healthScore['score'] }}<span style="font-size:14px;font-weight:600">/100</span></div>
    <div class="health-label">Score de santé</div>
    <div class="health-sub">{{ $healthScore['label'] === 'good' ? 'Chantier sain' : ($healthScore['label'] === 'warning' ? 'Attention requise' : 'Situation critique') }}</div>
  </div>
  <div class="health-breakdown">
    @foreach([['Planification','planning_score'],['Régularité','regularity_score'],['Budget','budget_score'],['Sécurité','safety_score']] as [$lbl,$key])
    <div class="hb-item">
      <span class="val">{{ $healthScore[$key] }}</span>
      <span class="lbl">{{ $lbl }}</span>
    </div>
    @endforeach
  </div>
</div>

<div class="body">

{{-- ── KPIs ── --}}
<div class="section">
  <div class="section-title">Indicateurs clés</div>
  <div class="kpi-grid">
    <div class="kpi-box">
      <label>Avancement réel</label>
      <div class="val" style="color:#2F60B0">{{ $logMeta['latest_progress'] }}%</div>
      <div class="bar-wrap"><div class="bar-fill" style="width:{{ $logMeta['latest_progress'] }}%;background:#2F60B0"></div></div>
    </div>
    <div class="kpi-box">
      <label>Délai contractuel</label>
      @if($daysLeft !== null)
        <div class="val" style="color:{{ $daysLeft < 0 ? '#ef4444' : ($daysLeft <= 30 ? '#f59e0b' : '#10b981') }}">
          {{ abs($daysLeft) }} j {{ $daysLeft < 0 ? 'retard' : 'restants' }}
        </div>
      @else
        <div class="val" style="color:#94a3b8">—</div>
      @endif
    </div>
    <div class="kpi-box">
      <label>Journaux terrain</label>
      <div class="val" style="color:#8b5cf6">{{ $logMeta['total'] }}</div>
      <div class="hint">rapports saisis</div>
    </div>
    <div class="kpi-box">
      <label>Incidents</label>
      <div class="val" style="color:{{ $logMeta['incident_count'] > 0 ? '#ef4444' : '#10b981' }}">{{ $logMeta['incident_count'] }}</div>
      <div class="hint">signalés</div>
    </div>
  </div>
</div>

{{-- ── Budget ── --}}
@if($budgetTotals['previsionnel'] > 0)
<div class="section">
  <div class="section-title">Trésorerie — récapitulatif</div>
  <div class="budget-grid">
    <div class="bud-box bud-box--prev">
      <label>Prévisionnel</label>
      <div class="val">{{ number_format($budgetTotals['previsionnel'] / 1_000_000, 0, ',', ' ') }} M FCFA</div>
    </div>
    <div class="bud-box bud-box--eng">
      <label>Engagé</label>
      <div class="val">{{ number_format($budgetTotals['engagement'] / 1_000_000, 0, ',', ' ') }} M FCFA</div>
    </div>
    <div class="bud-box bud-box--pay">
      <label>Décaissé</label>
      <div class="val">{{ number_format($budgetTotals['paiement'] / 1_000_000, 0, ',', ' ') }} M FCFA</div>
    </div>
    <div class="bud-box bud-box--sol">
      <label>Solde</label>
      <div class="val">{{ number_format($budgetTotals['solde'] / 1_000_000, 0, ',', ' ') }} M FCFA</div>
    </div>
  </div>
</div>
@endif

{{-- ── Journaux récents ── --}}
@if($logs->count())
<div class="section">
  <div class="section-title">Journaux terrain récents ({{ $logs->count() }} derniers)</div>
  <table>
    <thead>
      <tr>
        <th>Date</th><th>Météo</th><th>Équipe</th><th>Avancement</th><th>Incident</th>
      </tr>
    </thead>
    <tbody>
      @foreach($logs as $log)
      <tr>
        <td>{{ \Carbon\Carbon::parse($log->log_date)->format('d/m/Y') }}</td>
        <td>{{ $log->weather ?? '—' }}</td>
        <td>{{ $log->workers_count ?? '—' }}</td>
        <td>
          <div class="prog-cell">
            <div class="prog-bar"><div class="prog-fill" style="width:{{ $log->progress_percent ?? 0 }}%"></div></div>
            {{ $log->progress_percent ?? 0 }}%
          </div>
        </td>
        <td>{{ $log->has_incident ? ($log->incident_type ?? 'Oui') : '—' }}</td>
      </tr>
      @endforeach
    </tbody>
  </table>
</div>
@endif

{{-- ── Incidents ── --}}
@if($incidents->count())
<div class="section">
  <div class="section-title">Incidents ({{ $incidents->count() }})</div>
  <table>
    <thead>
      <tr><th>Réf</th><th>Date</th><th>Type</th><th>Gravité</th><th>Statut</th><th>Description</th></tr>
    </thead>
    <tbody>
      @foreach($incidents as $inc)
      <tr>
        <td style="font-family:'DejaVu Sans Mono',monospace;font-weight:700;color:#2F60B0">#INC-{{ str_pad($inc->id, 4, '0', STR_PAD_LEFT) }}</td>
        <td>{{ $inc->occurred_at->format('d/m/Y') }}</td>
        <td>{{ $inc->type }}</td>
        <td><span class="badge badge--{{ $inc->severity }}">{{ strtoupper($inc->severity) }}</span></td>
        <td><span class="badge badge--{{ $inc->status }}">{{ str_replace('_',' ',$inc->status) }}</span></td>
        <td style="max-width:180px">{{ \Illuminate\Support\Str::limit($inc->description, 80) }}</td>
      </tr>
      @endforeach
    </tbody>
  </table>
</div>
@endif

{{-- ── Équipe ── --}}
@if($project->members && $project->members->count())
<div class="section">
  <div class="section-title">Équipe du chantier</div>
  <div class="team-grid">
    @foreach($project->members as $m)
    <div class="team-card">
      <div class="name">{{ $m->user->name }}</div>
      <div class="role">{{ $m->assignment_role }}</div>
      <div class="email">{{ $m->user->email }}</div>
    </div>
    @endforeach
  </div>
</div>
@endif

</div>

<div class="footer">
  <span><span class="footer__brand">Charles</span> — Document confidentiel — Ne pas diffuser</span>
  <span>{{ $project->code }} · Rapport du {{ now()->format('d/m/Y') }}</span>
</div>

</body>
</html>
