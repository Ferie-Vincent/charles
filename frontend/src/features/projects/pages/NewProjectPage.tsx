import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProject } from '../api/create-project';
import type { CreateProjectPayload } from '../types';
import ProjectForm from '../components/ProjectForm';
import PageHeader from '../../../components/ui/PageHeader';

export default function NewProjectPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(payload: CreateProjectPayload) {
    setIsLoading(true);
    try {
      await createProject(payload);
      navigate('/projects');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <PageHeader title="Nouveau chantier" />
      <div className="card">
        <ProjectForm onSubmit={handleSubmit} isLoading={isLoading} />
      </div>
    </div>
  );
}
