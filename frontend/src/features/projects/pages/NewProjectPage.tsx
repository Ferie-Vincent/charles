import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProject } from '../api/create-project';
import type { CreateProjectPayload } from '../types';
import ProjectForm from '../components/ProjectForm';
import PageHeader from '../../../components/ui/PageHeader';

export default function NewProjectPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(payload: CreateProjectPayload) {
    setIsLoading(true);
    setError(null);
    try {
      await createProject(payload);
      navigate('/projects');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const msg = e.response?.data?.errors
        ? Object.values(e.response.data.errors).flat().join(' ')
        : (e.response?.data?.message ?? 'Erreur lors de la création du chantier.');
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <PageHeader title="Nouveau chantier" />
      <div className="card">
        {error && <p className="form-error" style={{ marginBottom: '1rem' }}>{error}</p>}
        <ProjectForm onSubmit={handleSubmit} isLoading={isLoading} />
      </div>
    </div>
  );
}
