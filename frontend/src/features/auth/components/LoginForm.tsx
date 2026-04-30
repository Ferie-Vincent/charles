import { useState } from 'react';
import type { LoginPayload } from '../api/login';

type LoginFormProps = {
  onSubmit: (payload: LoginPayload) => void;
  isLoading: boolean;
  error?: string;
};

export default function LoginForm({ onSubmit, isLoading, error }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <form
      className="login-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ email, password });
      }}
    >
      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      {error && <p className="form-error">{error}</p>}

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Connexion…' : 'Sign in'}
      </button>
    </form>
  );
}
