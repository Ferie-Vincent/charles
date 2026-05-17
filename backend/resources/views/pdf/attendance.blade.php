<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'DejaVu Sans', sans-serif; font-size: 9px; color: #1e293b; line-height: 1.4; }

  .header {
    background: #111828;
    padding: 12px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .header__brand { color: #fff; }
  .header__brand-name { font-size: 12px; font-weight: 700; letter-spacing: 0.5px; }
  .header__brand-sub  { font-size: 8px; color: #78CDD4; text-transform: uppercase; letter-spacing: 1px; }
  .header__doc { text-align: right; color: #fff; }
  .header__doc-type { font-size: 8px; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(255,255,255,0.55); }
  .header__doc-ref  { font-size: 14px; font-weight: 800; color: #78CDD4; font-family: 'DejaVu Sans Mono', monospace; }

  .accent-line { height: 3px; background: linear-gradient(90deg, #78CDD4 0%, #2F60B0 100%); }

  .meta {
    padding: 8px 20px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .meta__project { font-size: 11px; font-weight: 700; color: #2F60B0; }
  .meta__period  { font-size: 8px; color: #64748b; }
  .meta__legal   { font-size: 7px; color: #94a3b8; font-style: italic; }

  .content { padding: 10px 20px; }

  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  thead tr { background: #2F60B0; color: #fff; }
  thead th { padding: 5px 4px; text-align: center; font-size: 8px; font-weight: 600; border: 1px solid #1e3a6e; }
  thead th.th-worker { text-align: left; min-width: 100px; }
  thead th.th-trade  { text-align: left; min-width: 70px; }
  thead th.th-phone  { text-align: left; min-width: 60px; }
  thead th.th-date   { width: 22px; }
  thead th.th-total  { background: #78CDD4; color: #111828; min-width: 28px; }

  tbody tr:nth-child(even) { background: #f8fafc; }
  tbody tr:hover { background: #eff6ff; }
  tbody td { padding: 4px 4px; border: 1px solid #e2e8f0; font-size: 8px; }
  tbody td.td-worker { font-weight: 600; }
  tbody td.td-center { text-align: center; }
  tbody td.td-total  { text-align: center; font-weight: 700; color: #2F60B0; background: #eff6ff; }

  .present  { color: #16a34a; font-weight: 700; }
  .absent   { color: #dc2626; font-size: 7px; }
  .no-data  { color: #94a3b8; }

  .summary {
    margin-top: 10px;
    padding: 8px 12px;
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: 4px;
    display: flex;
    gap: 30px;
  }
  .summary__item { font-size: 8px; }
  .summary__label { color: #64748b; }
  .summary__value { font-weight: 700; color: #2F60B0; font-size: 10px; }

  .legal-notice {
    margin-top: 12px;
    padding: 6px 10px;
    background: #fefce8;
    border-left: 3px solid #eab308;
    font-size: 7px;
    color: #713f12;
  }

  .footer {
    margin-top: 15px;
    padding-top: 8px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    font-size: 7px;
    color: #94a3b8;
  }

  .signature-block {
    margin-top: 20px;
    display: flex;
    justify-content: space-between;
    gap: 20px;
  }
  .signature-box {
    flex: 1;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    padding: 8px 10px;
    min-height: 50px;
  }
  .signature-box__label { font-size: 7px; color: #64748b; font-weight: 600; margin-bottom: 4px; }
</style>
</head>
<body>

<div class="header">
  <div class="header__brand">
    <div class="header__brand-name">Helaman Expertise</div>
    <div class="header__brand-sub">Gestion de chantier</div>
  </div>
  <div class="header__doc">
    <div class="header__doc-type">Feuille de présence</div>
    <div class="header__doc-ref">CNPS / DDTE</div>
  </div>
</div>
<div class="accent-line"></div>

<div class="meta">
  <div>
    <div class="meta__project">{{ $project->name }} — {{ $project->code }}</div>
    <div class="meta__period">
      Période : {{ \Carbon\Carbon::parse($date_from)->format('d/m/Y') }} au {{ \Carbon\Carbon::parse($date_to)->format('d/m/Y') }}
    </div>
  </div>
  <div style="text-align:right;">
    <div class="meta__legal">Document officiel — à conserver 5 ans (Art. 37 Code du Travail CI)</div>
    <div class="meta__period">Généré le {{ $generated_at }}</div>
  </div>
</div>

<div class="content">

  @php $dateCount = count($dates); @endphp

  <table>
    <thead>
      <tr>
        <th class="th-worker">Nom & Prénom</th>
        <th class="th-trade">Corps de métier</th>
        <th class="th-phone">Téléphone</th>
        @foreach($dates as $date)
          <th class="th-date">{{ \Carbon\Carbon::parse($date)->format('d') }}<br><span style="font-size:7px;font-weight:400;">{{ \Carbon\Carbon::parse($date)->locale('fr')->isoFormat('ddd') }}</span></th>
        @endforeach
        <th class="th-total">Total<br>jours</th>
      </tr>
    </thead>
    <tbody>
      @foreach($rows as $row)
      <tr>
        <td class="td-worker">{{ $row['worker']->name }}</td>
        <td>{{ $row['worker']->trade }}</td>
        <td>{{ $row['worker']->phone ?? '—' }}</td>
        @foreach($dates as $date)
          @php $val = $row['days'][$date] ?? null; @endphp
          <td class="td-center">
            @if($val === true)
              <span class="present">P</span>
            @elseif($val === false)
              <span class="absent">A</span>
            @else
              <span class="no-data">·</span>
            @endif
          </td>
        @endforeach
        <td class="td-total">{{ $row['total'] }}</td>
      </tr>
      @endforeach
    </tbody>
  </table>

  @php
    $totalWorkers  = $rows->count();
    $totalJours    = $rows->sum('total');
    $avgPresence   = $dateCount > 0 && $totalWorkers > 0
        ? round($totalJours / ($totalWorkers * $dateCount) * 100, 1)
        : 0;
  @endphp

  <div class="summary">
    <div class="summary__item">
      <div class="summary__label">Ouvriers inscrits</div>
      <div class="summary__value">{{ $totalWorkers }}</div>
    </div>
    <div class="summary__item">
      <div class="summary__label">Jours de présence (total)</div>
      <div class="summary__value">{{ $totalJours }}</div>
    </div>
    <div class="summary__item">
      <div class="summary__label">Jours couverts</div>
      <div class="summary__value">{{ $dateCount }}</div>
    </div>
    <div class="summary__item">
      <div class="summary__label">Taux de présence</div>
      <div class="summary__value">{{ $avgPresence }} %</div>
    </div>
  </div>

  <div class="legal-notice">
    <strong>Légende :</strong> P = Présent · A = Absent · · = Non renseigné &nbsp;|&nbsp;
    Ce document tient lieu de feuille de présence légale conformément à l'article 37 du Code du Travail ivoirien.
    À présenter lors de tout contrôle CNPS ou inspection DDTE.
  </div>

  <div class="signature-block">
    <div class="signature-box">
      <div class="signature-box__label">Chef de chantier</div>
    </div>
    <div class="signature-box">
      <div class="signature-box__label">Conducteur de travaux</div>
    </div>
    <div class="signature-box">
      <div class="signature-box__label">Inspecteur DDTE / CNPS</div>
    </div>
  </div>

  <div class="footer">
    <span>Helaman Expertise — Chantier Platform</span>
    <span>{{ $project->location ?? '' }}</span>
    <span>{{ $generated_at }}</span>
  </div>

</div>
</body>
</html>
