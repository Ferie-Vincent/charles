<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'DejaVu Sans', sans-serif; font-size: 9px; color: #1e293b; }

  /* ── Header ── */
  .header {
    background: #111828;
    padding: 14px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0;
  }
  .header__logo-wrap { display: flex; align-items: center; gap: 10px; }
  .header__logo { height: 30px; width: auto; }
  .header__brand-name { font-size: 12px; font-weight: 700; color: #fff; }
  .header__brand-sub  { font-size: 8px; color: #78CDD4; text-transform: uppercase; letter-spacing: 1px; margin-top: 1px; }
  .header__right { text-align: right; }
  .header__right-label { font-size: 8px; color: rgba(255,255,255,0.45); text-transform: uppercase; letter-spacing: 0.8px; }
  .header__right-total { font-size: 16px; font-weight: 900; color: #78CDD4; font-family: 'DejaVu Sans Mono', monospace; }
  .header__right-date  { font-size: 8px; color: rgba(255,255,255,0.4); margin-top: 2px; }

  /* Accent line */
  .accent-line { height: 3px; background: linear-gradient(90deg, #78CDD4 0%, #2F60B0 100%); margin-bottom: 14px; }

  /* ── Doc meta strip ── */
  .meta-strip {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 4px;
    margin-bottom: 14px;
    border-bottom: 1px solid #e2e8f0;
  }
  .meta-strip__project { font-size: 11px; font-weight: 800; color: #1e293b; }
  .meta-strip__sep { color: #cbd5e1; }
  .meta-strip__version { font-size: 9px; color: #64748b; }
  .badge { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 8px; font-weight: 700; }
  .badge-draft     { background: #f1f5f9; color: #475569; }
  .badge-validated { background: #dcfce7; color: #166534; }
  .badge-archived  { background: #fef3c7; color: #92400e; }
  .meta-strip__code { font-size: 9px; font-weight: 700; color: #2F60B0; font-family: 'DejaVu Sans Mono', monospace; background: #EEF4FB; padding: 2px 7px; border-radius: 3px; }

  /* ── Table ── */
  table { width: 100%; border-collapse: collapse; }

  .th { background: #EEF4FB; font-weight: 800; font-size: 8px; color: #2F60B0; padding: 5px 8px; border-bottom: 2px solid #D8E8F8; text-transform: uppercase; letter-spacing: 0.05em; }

  .lot-header td {
    background: #111828;
    color: #fff;
    font-weight: 700;
    font-size: 9px;
    padding: 6px 8px;
    letter-spacing: 0.3px;
  }
  .lot-header .lot-name { color: #78CDD4; }
  .lot-header .lot-total { text-align: right; color: #fff; }

  tr.line:nth-child(even) td { background: #f8fafc; }
  tr.line td { padding: 4px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }

  .col-ouvrage { width: 42%; }
  .col-unite   { width: 8%;  text-align: center; color: #64748b; }
  .col-qty     { width: 10%; text-align: right; }
  .col-pu      { width: 13%; text-align: right; color: #64748b; }
  .col-total   { width: 14%; text-align: right; font-weight: 700; color: #2F60B0; }

  .subtotal-row td {
    background: #EEF4FB;
    font-weight: 700;
    font-size: 8.5px;
    padding: 4px 8px;
    border-top: 2px solid #D8E8F8;
    color: #2F60B0;
  }

  /* ── Grand total ── */
  .grand-total { margin-top: 14px; }
  .grand-total table { width: 280px; margin-left: auto; border: 1px solid #D8E8F8; border-radius: 6px; overflow: hidden; }
  .grand-total .gt-label { font-size: 9px; color: #64748b; padding: 6px 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .grand-total .gt-value { font-size: 14px; font-weight: 900; color: #111828; text-align: right; padding: 6px 10px; }
  .grand-total tr:first-child td { background: #EEF4FB; }

  /* ── Footer ── */
  .footer { margin-top: 16px; padding-top: 10px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 8px; color: #94a3b8; }
  .footer__brand { font-weight: 700; color: #2F60B0; }

  .num { font-variant-numeric: tabular-nums; }
</style>
</head>
<body>

{{-- ── Header ── --}}
<div class="header">
  <div class="header__logo-wrap">
    <img class="header__logo"
         src="data:image/png;base64,{{ base64_encode(file_get_contents(public_path('images/charles.png'))) }}"
         alt="Charles" />
    <div>
      <div class="header__brand-name">Charles</div>
      <div class="header__brand-sub">Devis Quantitatif Estimatif</div>
    </div>
  </div>
  <div class="header__right">
    <div class="header__right-label">Total HT</div>
    <div class="header__right-total num">{{ number_format($dqeVersion->total_ht, 0, ',', ' ') }} FCFA</div>
    <div class="header__right-date">Généré le {{ now()->format('d/m/Y') }}</div>
  </div>
</div>
<div class="accent-line"></div>

{{-- ── Meta strip ── --}}
<div class="meta-strip">
  <span class="meta-strip__code">{{ $project->code }}</span>
  <span class="meta-strip__project">{{ $project->name }}</span>
  <span class="meta-strip__sep">·</span>
  <span class="meta-strip__version">{{ $dqeVersion->name }} — v{{ $dqeVersion->version_number }}</span>
  <span class="meta-strip__sep">·</span>
  @if($dqeVersion->status === 'validated')
    <span class="badge badge-validated">Validé</span>
  @elseif($dqeVersion->status === 'archived')
    <span class="badge badge-archived">Archivé</span>
  @else
    <span class="badge badge-draft">Brouillon</span>
  @endif
</div>

{{-- ── Lines table ── --}}
<table>
  <thead>
    <tr>
      <th class="th col-ouvrage">Désignation</th>
      <th class="th col-unite">Unité</th>
      <th class="th col-qty">Quantité</th>
      <th class="th col-pu">PU HT (FCFA)</th>
      <th class="th col-total">Montant HT (FCFA)</th>
    </tr>
  </thead>
  <tbody>
    @foreach($lots as $lotGroup)
      <tr class="lot-header">
        <td colspan="4"><span class="lot-name">{{ strtoupper($lotGroup['lot']) }}</span></td>
        <td class="lot-total num">{{ number_format($lotGroup['subtotal'], 0, ',', ' ') }}</td>
      </tr>
      @foreach($lotGroup['lines'] as $line)
        <tr class="line">
          <td class="col-ouvrage">{{ $line->ouvrage }}</td>
          <td class="col-unite">{{ $line->unite }}</td>
          <td class="col-qty num">{{ number_format($line->quantite, 3, ',', ' ') }}</td>
          <td class="col-pu num">{{ number_format($line->prix_unitaire, 0, ',', ' ') }}</td>
          <td class="col-total num">{{ number_format($line->montant_ht, 0, ',', ' ') }}</td>
        </tr>
      @endforeach
      <tr class="subtotal-row">
        <td colspan="4" style="text-align:right;">Sous-total {{ $lotGroup['lot'] }}</td>
        <td style="text-align:right;" class="num">{{ number_format($lotGroup['subtotal'], 0, ',', ' ') }}</td>
      </tr>
    @endforeach
  </tbody>
</table>

{{-- ── Grand total ── --}}
<div class="grand-total">
  <table>
    <tr>
      <td class="gt-label">Total général HT</td>
      <td class="gt-value num">{{ number_format($dqeVersion->total_ht, 0, ',', ' ') }} FCFA</td>
    </tr>
  </table>
</div>

<div class="footer">
  <span><span class="footer__brand">Charles</span> — {{ $project->name }}</span>
  <span>DQE {{ $dqeVersion->name }} · {{ now()->format('d/m/Y') }}</span>
</div>

</body>
</html>
