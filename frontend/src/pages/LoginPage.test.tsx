import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import LoginPage from './LoginPage';

vi.mock('../api/auth', () => ({
  login: vi.fn(),
  signup: vi.fn(),
}));

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  it('renders login form with email, password fields and submit button', () => {
    renderLoginPage();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login to dashboard/i })).toBeInTheDocument();
  });

  it('renders the welcome heading and signup link', () => {
    renderLoginPage();

    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create an account/i })).toHaveAttribute('href', '/signup');
  });

  it('shows error message when login fails', async () => {
    const { login } = await import('../api/auth');
    vi.mocked(login).mockRejectedValueOnce({
      response: { data: { error: { message: 'Invalid credentials' } } },
    });

    renderLoginPage();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/email/i), 'bad@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /login to dashboard/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('disables submit button and shows loading text while submitting', async () => {
    const { login } = await import('../api/auth');
    vi.mocked(login).mockImplementationOnce(() => new Promise(() => {}));

    renderLoginPage();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/email/i), 'user@test.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login to dashboard/i }));

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeDisabled();
    });
    expect(screen.getByText(/signing in/i)).toBeInTheDocument();
  });
});