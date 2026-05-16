import { useState, type FormEvent } from 'react';
import { TRADES } from '../../api/workers';

interface Props {
  onSave: (d: { name: string; trade: string; phone?: string }) => void;
  onCancel: () => void;
}

export default function AddWorkerForm({ onSave, onCancel }: Props) {
  const [name, setName]             = useState('');
  const [trade, setTrade]           = useState('');
  const [customTrade, setCustomTrade] = useState('');
  const [phone, setPhone]           = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    const finalTrade = trade === 'Autre' ? customTrade.trim() : trade;
    if (!name.trim() || !finalTrade) return;
    onSave({ name: name.trim(), trade: finalTrade, phone: phone.trim() || undefined });
  }

  return (
    <form className="workers-panel__add-form" onSubmit={submit}>
      <div className="workers-panel__add-row">
        <input
          className="workers-panel__input"
          placeholder="Nom complet *"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <select
          className="workers-panel__select"
          value={trade}
          onChange={e => setTrade(e.target.value)}
          required
        >
          <option value="">Corps de métier *</option>
          {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      {trade === 'Autre' && (
        <input
          className="workers-panel__input"
          placeholder="Précisez le corps de métier *"
          value={customTrade}
          onChange={e => setCustomTrade(e.target.value)}
          required
        />
      )}
      <div className="workers-panel__add-row">
        <input
          className="workers-panel__input"
          placeholder="Téléphone (optionnel)"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          type="tel"
        />
        <div className="workers-panel__add-btns">
          <button type="submit" className="btn btn--primary btn--sm">Ajouter</button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>Annuler</button>
        </div>
      </div>
    </form>
  );
}
