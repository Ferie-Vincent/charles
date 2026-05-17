<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'DejaVu Sans', sans-serif; font-size: 11px; color: #1e293b; line-height: 1.5; }

  /* ── Header ── */
  .header {
    background: #111828;
    padding: 16px 28px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .header__logo-wrap { display: flex; align-items: center; gap: 12px; }
  .header__logo { height: 34px; width: auto; }
  .header__brand { color: #fff; }
  .header__brand-name { font-size: 13px; font-weight: 700; letter-spacing: 0.5px; }
  .header__brand-sub  { font-size: 9px; color: #78CDD4; margin-top: 1px; text-transform: uppercase; letter-spacing: 1px; }
  .header__doc { text-align: right; color: #fff; }
  .header__doc-type { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(255,255,255,0.55); }
  .header__doc-ref  { font-size: 18px; font-weight: 800; color: #78CDD4; font-family: 'DejaVu Sans Mono', monospace; }
  .header__doc-date { font-size: 9px; color: rgba(255,255,255,0.5); margin-top: 2px; }

  /* Teal accent line */
  .accent-line { height: 3px; background: linear-gradient(90deg, #78CDD4 0%, #2F60B0 100%); }

  /* ── Severity band ── */
  .severity-band { padding: 7px 28px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: #fff; display: flex; align-items: center; gap: 16px; }
  .severity-mineur  { background: #2563eb; }
  .severity-majeur  { background: #d97706; }
  .severity-critique{ background: #dc2626; }
  .severity-band__dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.5); display: inline-block; }

  /* ── Body ── */
  .body { padding: 22px 28px; }

  /* ── Project strip ── */
  .project-strip {
    background: #EEF4FB;
    border: 1px solid #D8E8F8;
    border-left: 4px solid #2F60B0;
    border-radius: 4px;
    padding: 10px 14px;
    margin-bottom: 22px;
    display: flex;
    gap: 20px;
    align-items: center;
  }
  .project-strip .code { font-size: 12px; font-weight: 800; color: #2F60B0; font-family: 'DejaVu Sans Mono', monospace; }
  .project-strip .name { font-size: 12px; font-weight: 700; color: #1e293b; }
  .project-strip .location { font-size: 10px; color: #64748b; margin-top: 1px; }

  /* ── Meta grid ── */
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 22px; }
  .meta-box { border: 1px solid #e2e8f0; border-radius: 5px; padding: 9px 12px; background: #f8fafc; }
  .meta-box label { font-size: 8px; text-transform: uppercase; letter-spacing: 0.6px; color: #94a3b8; display: block; margin-bottom: 3px; }
  .meta-box span { font-size: 12px; font-weight: 700; color: #1e293b; }

  /* Status badges */
  .status-badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 9px; font-weight: 700; text-transform: uppercase; }
  .status-ouvert   { background: #fee2e2; color: #dc2626; }
  .status-en_cours { background: #fef3c7; color: #d97706; }
  .status-resolu   { background: #d1fae5; color: #059669; }
  .status-ferme    { background: #f1f5f9; color: #6b7280; }

  /* ── Section ── */
  .section { margin-bottom: 18px; }
  .section-title {
    font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;
    color: #2F60B0; border-bottom: 2px solid #D8E8F8; padding-bottom: 4px; margin-bottom: 10px;
  }
  .section-body { font-size: 11px; line-height: 1.65; color: #374151; white-space: pre-wrap; }
  .section-body.empty { color: #9ca3af; font-style: italic; }

  /* ── Signatures ── */
  .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 30px; }
  .sig-box { border-top: 2px solid #2F60B0; padding-top: 6px; }
  .sig-box label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.4px; color: #64748b; }
  .sig-space { height: 42px; }

  /* ── Footer ── */
  .footer {
    margin-top: 28px;
    border-top: 1px solid #e2e8f0;
    padding: 10px 28px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 8px;
    color: #94a3b8;
  }
  .footer__brand { font-weight: 700; color: #2F60B0; }
</style>
</head>
<body>

{{-- ── Header ── --}}
<div class="header">
  <div class="header__logo-wrap">
    <img class="header__logo"
         src="data:image/png;base64,{{ base64_encode(file_get_contents(public_path('images/charles.png'))) }}"
         alt="Charles" />
    <div class="header__brand">
      <div class="header__brand-name">Charles</div>
      <div class="header__brand-sub">Bureau d'études BTP</div>
    </div>
  </div>
  <div class="header__doc">
    <div class="header__doc-type">Fiche d'incident</div>
    <div class="header__doc-ref">#INC-{{ str_pad($incident->id, 4, '0', STR_PAD_LEFT) }}</div>
    <div class="header__doc-date">Généré le {{ now()->format('d/m/Y à H:i') }}</div>
  </div>
</div>
<div class="accent-line"></div>

{{-- ── Severity band ── --}}
<div class="severity-band severity-{{ $incident->severity }}">
  <span class="severity-band__dot"></span>
  Gravité : {{ strtoupper($incident->severity) }}
  &nbsp;&middot;&nbsp;
  Type : {{ $incident->type }}
</div>

<div class="body">

  {{-- Project strip --}}
  <div class="project-strip">
    <span class="code">{{ $project->code }}</span>
    <div>
      <div class="name">{{ $project->name }}</div>
      <div class="location">{{ $project->location }}</div>
    </div>
  </div>

  {{-- Meta grid --}}
  <div class="meta-grid">
    <div class="meta-box">
      <label>Date de l'incident</label>
      <span>{{ $incident->occurred_at->format('d/m/Y') }}</span>
    </div>
    <div class="meta-box">
      <label>Heure</label>
      <span>{{ $incident->occurred_at->format('H:i') }}</span>
    </div>
    <div class="meta-box">
      <label>Statut</label>
      <span class="status-badge status-{{ $incident->status }}">{{ str_replace('_', ' ', $incident->status) }}</span>
    </div>
    <div class="meta-box">
      <label>Lieu sur le chantier</label>
      <span>{{ $incident->location ?: '—' }}</span>
    </div>
    <div class="meta-box">
      <label>Déclaré par</label>
      <span>{{ $incident->reporter->name }}</span>
    </div>
    @if($incident->resolved_at)
    <div class="meta-box">
      <label>Date résolution</label>
      <span>{{ $incident->resolved_at->format('d/m/Y') }}</span>
    </div>
    @endif
  </div>

  <div class="section">
    <div class="section-title">Description de l'incident</div>
    <div class="section-body">{{ $incident->description }}</div>
  </div>

  <div class="section">
    <div class="section-title">Action(s) corrective(s)</div>
    @if($incident->corrective_action)
      <div class="section-body">{{ $incident->corrective_action }}</div>
    @else
      <div class="section-body empty">Aucune action corrective renseignée</div>
    @endif
  </div>

  @if($incident->witnesses)
  <div class="section">
    <div class="section-title">Témoins / Personnes impliquées</div>
    <div class="section-body">{{ $incident->witnesses }}</div>
  </div>
  @endif

  <div class="signatures">
    <div class="sig-box">
      <div class="sig-space"></div>
      <label>Déclarant · {{ $incident->reporter->name }}</label>
    </div>
    <div class="sig-box">
      <div class="sig-space"></div>
      <label>Chef de chantier</label>
    </div>
    <div class="sig-box">
      <div class="sig-space"></div>
      <label>Direction technique</label>
    </div>
  </div>

</div>

<div class="footer">
  <span><span class="footer__brand">Charles</span> — Document confidentiel</span>
  <span>Fiche #INC-{{ str_pad($incident->id, 4, '0', STR_PAD_LEFT) }} · {{ $project->code }}</span>
</div>

</body>
</html>
