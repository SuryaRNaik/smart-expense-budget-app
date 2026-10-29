import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { api } from '../../api/client';
import { AuthProvider } from '../../auth/AuthContext';
import { RegistrationPage } from './RegistrationPage';

vi.mock('../../api/client', () => ({
  api: {
    post: vi.fn(),
  },
}));

function renderRegistrationPage() {
  return render(
    <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <AuthProvider>
        <RegistrationPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('RegistrationPage', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers a user and offers sign-in after success', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({
      message: 'User registered successfully.',
      user: { userId: 'user-1', name: 'Demo User', email: 'demo@example.com', role: 'user' },
    });

    renderRegistrationPage();
    await user.type(screen.getByLabelText('Name'), 'Demo User');
    await user.type(screen.getByLabelText('Email'), 'demo@example.com');
    await user.type(screen.getByLabelText('Password'), 'secure-password');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect((await screen.findByRole('status')).textContent).toContain('Registration successful.');
    expect(api.post).toHaveBeenCalledWith('/auth/register', {
      name: 'Demo User',
      email: 'demo@example.com',
      password: 'secure-password',
    });
    expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe('/login');
  });

  it('shows registration errors', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue(new Error('An account with this email already exists.'));

    renderRegistrationPage();
    await user.type(screen.getByLabelText('Name'), 'Demo User');
    await user.type(screen.getByLabelText('Email'), 'demo@example.com');
    await user.type(screen.getByLabelText('Password'), 'secure-password');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect((await screen.findByRole('alert')).textContent).toContain(
      'An account with this email already exists.',
    );
  });
});
