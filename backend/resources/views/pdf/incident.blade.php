<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'DejaVu Sans', sans-serif; font-size: 11px; color: #1a1a2e; line-height: 1.5; }

  .header { background: #1a1a2e; color: #fff; padding: 20px 28px; display: flex; justify-content: space-between; align-items: flex-start; }
  .header-left h1 { font-size: 18px; font-weight: 700; letter-spacing: 1px; }
  .header-left p { font-size: 10px; opacity: 0.7; margin-top: 2px; }
  .header-right { text-align: right; font-size: 10px; opacity: 0.8; }
  .header-right strong { font-size: 14px; opacity: 1; display: block; }

  .severity-band { padding: 8px 28px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: #fff; }
  .severity-mineur { background: #2563eb; }
  .severity-majeur { background: #d97706; }
  .severity-critique { background: #dc2626; }

  .body { padding: 24px 28px; }

  .meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 24px; }
  .meta-box { border: 1px solid #e5e7eb; border-radius: 4px; padding: 10px 12px; }
  .meta-box label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; display: block; margin-bottom: 3px; }
  .meta-box span { font-size: 12px; font-weight: 600; }

  .status-badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
  .status-ouvert { background: #fee2e2; color: #dc2626; }
  .status-en_cours { background: #fef3c7; color: #d97706; }
  .status-resolu { background: #d1fae5; color: #059669; }
  .status-ferme { background: #f3f4f6; color: #6b7280; }

  .section { margin-bottom: 20px; }
  .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 10px; }
  .section-body { font-size: 11px; line-height: 1.6; color: #374151; white-space: pre-wrap; }
  .section-body.empty { color: #9ca3af; font-style: italic; }

  .project-strip { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; padding: 10px 12px; margin-bottom: 24px; display: flex; gap: 24px; align-items: center; }
  .project-strip .code { font-size: 11px; font-weight: 700; color: #f97316; font-family: monospace; }
  .project-strip .name { font-size: 12px; font-weight: 600; }
  .project-strip .location { font-size: 10px; color: #6b7280; }

  .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 32px; }
  .sig-box { border-top: 1px solid #374151; padding-top: 6px; }
  .sig-box label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; }
  .sig-box .sig-space { height: 40px; }

  .footer { margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 10px; display: flex; justify-content: space-between; font-size: 9px; color: #9ca3af; }
</style>
</head>
<body>

<div class="header">
  <div class="header-left">
    <h1>FICHE D'INCIDENT</h1>
    <p>Rapport officiel — Chantier Platform BTP</p>
  </div>
  <div class="header-right">
    <strong>#INC-{{ str_pad($incident->id, 4, '0', STR_PAD_LEFT) }}</strong>
    Généré le {{ now()->format('d/m/Y à H:i') }}
  </div>
</div>

<div class="severity-band severity-{{ $incident->severity }}">
  ⚠ Gravité : {{ strtoupper($incident->severity) }} &nbsp;|&nbsp; Type : {{ $incident->type }}
</div>

<div class="body">

  <div class="project-strip">
    <span class="code">{{ $project->code }}</span>
    <div>
      <div class="name">{{ $project->name }}</div>
      <div class="location">{{ $project->location }}</div>
    </div>
  </div>

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

  <div class="footer">
    <span>Chantier Platform — Document confidentiel</span>
    <span>Fiche #INC-{{ str_pad($incident->id, 4, '0', STR_PAD_LEFT) }} · {{ $project->code }}</span>
  </div>

</div>
</body>
</html>
