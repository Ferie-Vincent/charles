<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: DejaVu Sans, sans-serif; font-size: 9px; color: #1e293b; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 2px solid #f97316; }
  .header-left h1 { font-size: 16px; font-weight: 700; color: #0f172a; }
  .header-left p { font-size: 10px; color: #64748b; margin-top: 2px; }
  .header-right { text-align: right; font-size: 9px; color: #64748b; }
  .header-right .total { font-size: 14px; font-weight: 700; color: #f97316; }
  .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 8px; font-weight: 600; }
  .badge-draft { background: #f1f5f9; color: #475569; }
  .badge-validated { background: #dcfce7; color: #166534; }
  .badge-archived { background: #fef3c7; color: #92400e; }
  table { width: 100%; border-collapse: collapse; }
  .lot-header td { background: #1e293b; color: #fff; font-weight: 700; font-size: 9px; padding: 5px 8px; }
  .lot-header .lot-total { text-align: right; }
  tr.line:nth-child(even) { background: #f8fafc; }
  tr.line td { padding: 4px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
  .col-ouvrage { width: 42%; }
  .col-unite { width: 8%; text-align: center; }
  .col-qty { width: 10%; text-align: right; }
  .col-pu { width: 13%; text-align: right; }
  .col-total { width: 14%; text-align: right; font-weight: 600; }
  .th { background: #f1f5f9; font-weight: 700; font-size: 8px; color: #475569; padding: 4px 8px; border-bottom: 2px solid #e2e8f0; text-transform: uppercase; letter-spacing: 0.05em; }
  .subtotal-row td { background: #f8fafc; font-weight: 700; font-size: 8.5px; padding: 4px 8px; border-top: 2px solid #e2e8f0; color: #475569; }
  .grand-total { margin-top: 12px; text-align: right; }
  .grand-total table { width: 300px; margin-left: auto; }
  .grand-total td { padding: 4px 8px; }
  .grand-total .label { font-size: 9px; color: #64748b; }
  .grand-total .value { font-size: 13px; font-weight: 700; color: #0f172a; text-align: right; }
  .footer { margin-top: 16px; font-size: 8px; color: #94a3b8; text-align: center; }
  .num { font-variant-numeric: tabular-nums; }
</style>
</head>
<body>

<div class="header">
  <div class="header-left">
    <h1>{{ $project->name }}</h1>
    <p>{{ $project->code }} &nbsp;·&nbsp; DQE — {{ $dqeVersion->name }} &nbsp;·&nbsp; Version {{ $dqeVersion->version_number }}</p>
    <div style="margin-top:4px">
      @if($dqeVersion->status === 'validated')
        <span class="badge badge-validated">Validé</span>
      @elseif($dqeVersion->status === 'archived')
        <span class="badge badge-archived">Archivé</span>
      @else
        <span class="badge badge-draft">Brouillon</span>
      @endif
    </div>
  </div>
  <div class="header-right">
    <div style="font-size:9px;color:#64748b;">Total HT</div>
    <div class="total num">{{ number_format($dqeVersion->total_ht, 0, ',', ' ') }} FCFA</div>
    <div style="margin-top:4px;font-size:8px;">Généré le {{ now()->format('d/m/Y') }}</div>
  </div>
</div>

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
        <td colspan="4">{{ strtoupper($lotGroup['lot']) }}</td>
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

<div class="grand-total">
  <table>
    <tr>
      <td class="label">TOTAL GÉNÉRAL HT</td>
      <td class="value num">{{ number_format($dqeVersion->total_ht, 0, ',', ' ') }} FCFA</td>
    </tr>
  </table>
</div>

<div class="footer">
  Chantier Platform BTP &nbsp;·&nbsp; {{ $project->name }} &nbsp;·&nbsp; DQE {{ $dqeVersion->name }}
</div>

</body>
</html>
