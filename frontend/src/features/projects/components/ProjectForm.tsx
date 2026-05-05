import { useState } from 'react';
import type { CreateProjectPayload } from '../types';

type ProjectFormProps = {
  onSubmit: (payload: CreateProjectPayload) => void;
  isLoading?: boolean;
};

export default function ProjectForm({ onSubmit, isLoading }: ProjectFormProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('draft');
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  return (
    <form
      className="project-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          code,
          name,
          status,
          location: location || undefined,
          budget_amount: budget ? Number(budget) : undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        });
      }}
    >
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="code">Code chantier *</label>
          <input id="code" value={code} onChange={(e) => setCode(e.target.value)} required />
        </div>
        <div className="form-group">
          <label htmlFor="status">Statut *</label>
          <select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="draft">Brouillon</option>
            <option value="active">Actif</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="name">Nom du chantier *</label>
        <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="form-group">
        <label htmlFor="location">Localisation</label>
        <input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="budget">Budget prévu (FCFA)</label>
          <input id="budget" type="number" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="start_date">Date de début</label>
          <input id="start_date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="end_date">Date de fin prévue</label>
          <input id="end_date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Enregistrement…' : 'Créer le chantier'}
      </button>
    </form>
  );
}
