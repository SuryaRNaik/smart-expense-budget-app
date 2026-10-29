import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';

export function ResetPasswordPage() {
  const { accessToken } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (accessToken) {
    return <Navigate to="/transactions" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match.');
      }

      await api.post('/auth/reset-password', { token, password });
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 1500);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <section className="content-panel" aria-labelledby="reset-password-title">
        <p className="eyebrow">Set a new password</p>
        <h2 id="reset-password-title">Reset password</h2>
        <p>Choose a strong, unique password for your account.</p>
        {error && <p className="form-message error-message" role="alert">{error}</p>}
        {success && (
          <p className="form-message success-message" role="status">
            Password reset successful. Redirecting to sign in…
          </p>
        )}
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Reset token
            <input
              name="token"
              onChange={(event) => setToken(event.target.value)}
              placeholder="Paste the reset token here"
              required
              value={token}
            />
          </label>
          <label>
            New password
            <input
              autoComplete="new-password"
              minLength={8}
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          <label>
            Confirm new password
            <input
              autoComplete="new-password"
              minLength={8}
              name="confirmPassword"
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              type="password"
              value={confirmPassword}
            />
          </label>
          <button className="primary-button" disabled={submitting} type="submit">
            {submitting ? 'Resetting password…' : 'Reset password'}
          </button>
        </form>
        <p className="auth-switch">
          <Link to="/login">Back to sign in</Link>
        </p>
      </section>
    </div>
  );
}
