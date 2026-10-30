import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

const createToken = (expiresAtMs) => {
  const encode = (value) => {
    const base64 = btoa(JSON.stringify(value));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  };

  const payload = {
    userId: 'user-123',
    role: 'user',
    tokenType: 'access',
    exp: Math.floor(expiresAtMs / 1000),
  };

  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`;
};

function SessionHarness() {
  const { accessToken, isAuthenticated, setAccessToken, setUser, clearUser } = useAuth();

  return (
    <>
      <button
        onClick={() => {
          setUser({ userId: 'user-123', name: 'Test User' });
          setAccessToken(createToken(Date.now() + 15 * 60 * 1000));
        }}
      >
        Sign in
      </button>
      <button onClick={clearUser}>Sign out</button>
      <span>{isAuthenticated ? 'authenticated' : 'signed-out'}</span>
      <span>{accessToken ? 'token-present' : 'token-missing'}</span>
    </>
  );
}

describe('TC-Sec-05: AuthContext session timeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv('VITE_SESSION_TIMEOUT_SECONDS', '900');
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('logs the user out after the configured inactivity timeout', async () => {
    render(
      <AuthProvider>
        <SessionHarness />
      </AuthProvider>,
    );

    await act(async () => {
      screen.getByRole('button', { name: 'Sign in' }).click();
    });

    expect(screen.getByText('authenticated')).toBeTruthy();

    await act(async () => {
      vi.advanceTimersByTime(900 * 1000 + 1000);
    });

    expect(screen.getByText('signed-out')).toBeTruthy();
    expect(screen.getByText('token-missing')).toBeTruthy();
  });
});
