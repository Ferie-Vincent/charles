<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: DejaVu Sans, Arial, sans-serif; font-size: 11px; color: #1a1a1a; background: #fff; }
  .page { padding: 30px 36px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2F60B0; padding-bottom: 14px; margin-bottom: 20px; }
  .header-title { font-size: 18px; font-weight: 700; color: #2F60B0; }
  .header-sub  { font-size: 11px; color: #555; margin-top: 3px; }
  .header-meta { text-align: right; font-size: 10px; color: #666; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 10px; font-weight: 700; }
  .badge-payee      { background: #dcfce7; color: #166534; }
  .badge-validee    { background: #dbeafe; color: #1e40af; }
  .badge-soumise    { background: #fef9c3; color: #854d0e; }
  .badge-brouillon  { background: #f3f4f6; color: #374151; }
  .section-title { font-size: 12px; font-weight: 700; color: #2F60B0; margin: 18px 0 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; }
  .info-row { display: flex; gap: 6px; }
  .info-label { color: #6b7280; min-width: 130px; }
  .deductions-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  .deductions-table th { background: #2F60B0; color: #fff; text-align: left; padding: 7px 10px; font-size: 10px; font-weight: 600; }
  .deductions-table td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; }
  .deductions-table tr.subtotal td { background: #f9fafb; font-weight: 600; }
  .deductions-table tr.total td    { background: #1e3a8a; color: #fff; font-weight: 700; font-size: 12px; }
  .deductions-table tr.deduction td:last-child { color: #dc2626; }
  .amount { text-align: right; white-space: nowrap; }
  .footer { margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
  .sig-box { border: 1px solid #d1d5db; padding: 10px; border-radius: 6px; }
  .sig-label { font-size: 10px; color: #6b7280; margin-bottom: 30px; }
  .sig-line { border-top: 1px solid #9ca3af; margin-top: 4px; padding-top: 4px; font-size: 9px; color: #9ca3af; }
  .watermark { position: fixed; bottom: 14px; left: 0; right: 0; text-align: center; font-size: 9px; color: #d1d5db; }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div>
      <div class="header-title">Situation de Travaux — {{ $situation->numero }}</div>
      <div class="header-sub">Période : {{ $situation->periode }} · Chantier : {{ $project->name }} ({{ $project->code }})</div>
    </div>
    <div class="header-meta">
      @php
        $statusLabels = [
          'brouillon'   => ['Brouillon',   'badge-brouillon'],
          'en_revue_ct' => ['En revue CT', 'badge-brouillon'],
          'en_revue_dt' => ['En revue DT', 'badge-brouillon'],
          'soumise'     => ['Soumise',     'badge-soumise'],
          'contestee'   => ['Contestée',   'badge-brouillon'],
          'validee_moe' => ['Validée MOE', 'badge-validee'],
          'payee'       => ['Payée',       'badge-payee'],
        ];
        [$statusLabel, $statusClass] = $statusLabels[$situation->status] ?? ['Inconnu', 'badge-brouillon'];
      @endphp
      <span class="badge {{ $statusClass }}">{{ $statusLabel }}</span><br>
      <span style="margin-top:6px;display:block;">Généré le {{ now()->format('d/m/Y') }}</span>
    </div>
  </div>

  {{-- Informations générales --}}
  <div class="section-title">Informations générales</div>
  <div class="info-grid">
    <div class="info-row"><span class="info-label">Chantier</span><span>{{ $project->name }}</span></div>
    <div class="info-row"><span class="info-label">Code projet</span><span>{{ $project->code }}</span></div>
    <div class="info-row"><span class="info-label">Maître d'ouvrage</span><span>{{ $project->maitre_ouvrage ?? '—' }}</span></div>
    <div class="info-row"><span class="info-label">Maître d'œuvre</span><span>{{ $project->maitre_oeuvre ?? '—' }}</span></div>
    <div class="info-row"><span class="info-label">Établi par</span><span>{{ $situation->creator->name ?? '—' }}</span></div>
    <div class="info-row"><span class="info-label">Version DQE</span><span>{{ $situation->dqeVersion ? $situation->dqeVersion->name . ' (v' . $situation->dqeVersion->version_number . ')' : '—' }}</span></div>
    @if($situation->submitted_at)
    <div class="info-row"><span class="info-label">Soumise le</span><span>{{ \Carbon\Carbon::parse($situation->submitted_at)->format('d/m/Y') }}</span></div>
    @endif
    @if($situation->validated_at)
    <div class="info-row"><span class="info-label">Validée le</span><span>{{ \Carbon\Carbon::parse($situation->validated_at)->format('d/m/Y') }}</span></div>
    @endif
    @if($situation->date_paiement)
    <div class="info-row"><span class="info-label">Payée le</span><span>{{ \Carbon\Carbon::parse($situation->date_paiement)->format('d/m/Y') }}</span></div>
    @endif
  </div>

  {{-- Décompte financier --}}
  <div class="section-title">Décompte financier (FCFA HT)</div>

  @php
    $baseMarche  = (float) ($project->montant_marche ?? 0);
    $montantBrut = (float) $situation->montant_brut_ht;
    $cumulPrec   = (float) $situation->cumul_precedent_ht;
    $retenue     = (float) $situation->retenue_garantie_amount;
    $avance      = (float) $situation->avance_remboursement;
    $vatAmount   = (float) $situation->vat_amount;
    $netAPayer   = (float) $situation->net_a_payer;
    $baseHT      = $montantBrut - $retenue - $avance;

    function fmtXof(float $n): string {
        return number_format($n, 0, ',', ' ') . ' XOF';
    }
  @endphp

  <table class="deductions-table">
    <thead>
      <tr>
        <th style="width:60%">Désignation</th>
        <th style="width:20%">Taux</th>
        <th class="amount" style="width:20%">Montant</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Montant brut du marché cumulé à {{ $situation->avancement_pct }}%</td>
        <td>{{ $situation->avancement_pct }}%</td>
        <td class="amount">{{ fmtXof($montantBrut) }}</td>
      </tr>
      <tr class="deduction">
        <td>— Cumul situations précédentes certifiées</td>
        <td>—</td>
        <td class="amount">{{ fmtXof($cumulPrec) }}</td>
      </tr>
      <tr class="subtotal">
        <td>Montant brut période ({{ $situation->numero }})</td>
        <td></td>
        <td class="amount">{{ fmtXof($montantBrut - $cumulPrec) }}</td>
      </tr>
      @if($retenue > 0)
      <tr class="deduction">
        <td>— Retenue de garantie</td>
        <td>{{ $situation->retenue_garantie_pct }}%</td>
        <td class="amount">{{ fmtXof($retenue) }}</td>
      </tr>
      @endif
      @if($avance > 0)
      <tr class="deduction">
        <td>— Remboursement avance de démarrage</td>
        <td></td>
        <td class="amount">{{ fmtXof($avance) }}</td>
      </tr>
      @endif
      <tr class="subtotal">
        <td>Base HT après déductions</td>
        <td></td>
        <td class="amount">{{ fmtXof($baseHT) }}</td>
      </tr>
      <tr>
        <td>+ TVA</td>
        <td>{{ $situation->vat_rate }}%</td>
        <td class="amount">{{ fmtXof($vatAmount) }}</td>
      </tr>
      <tr class="total">
        <td colspan="2">NET À PAYER TTC</td>
        <td class="amount">{{ fmtXof($netAPayer) }}</td>
      </tr>
    </tbody>
  </table>

  @if($situation->notes)
  <div class="section-title">Notes</div>
  <p style="color:#374151;">{{ $situation->notes }}</p>
  @endif

  {{-- Signatures --}}
  <div class="footer">
    <div class="sig-box">
      <div class="sig-label">Établi par (Métreur économiste)</div>
      <div class="sig-line">Nom &amp; signature</div>
    </div>
    <div class="sig-box">
      <div class="sig-label">Validé par (Maître d'œuvre)</div>
      <div class="sig-line">Nom &amp; signature &amp; cachet</div>
    </div>
  </div>

</div>
<div class="watermark">Charles — Plateforme de gestion BTP · Document généré automatiquement</div>
</body>
</html>
