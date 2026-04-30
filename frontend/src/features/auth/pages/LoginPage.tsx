import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import { login, type LoginPayload } from '../api/login';
import { setAuthUser } from '../stores/auth-store';

export default function LoginPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function handleSubmit(payload: LoginPayload) {
    setIsLoading(true);
    setError(undefined);

    try {
      const data = await login(payload);
      setAuthUser(data.user);
      navigate('/');
    } catch {
      setError('Identifiants incorrects.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card card">
        <h1>Chantier Platform</h1>
        <p>Connectez-vous à votre espace</p>
        <LoginForm onSubmit={handleSubmit} isLoading={isLoading} error={error} />
      </div>
    </div>
  );
}
