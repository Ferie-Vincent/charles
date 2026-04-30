import { fireEvent, render, screen } from '@testing-library/react';
import LoginForm from './LoginForm';

describe('LoginForm', () => {
  it('collects email and password before submit', () => {
    const handleSubmit = vi.fn();

    render(<LoginForm onSubmit={handleSubmit} isLoading={false} />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'direction@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(handleSubmit).toHaveBeenCalledWith({
      email: 'direction@example.com',
      password: 'password',
    });
  });

  it('shows error message when provided', () => {
    render(<LoginForm onSubmit={vi.fn()} isLoading={false} error="Identifiants incorrects." />);
    expect(screen.getByText('Identifiants incorrects.')).toBeInTheDocument();
  });

  it('disables submit button while loading', () => {
    render(<LoginForm onSubmit={vi.fn()} isLoading={true} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
