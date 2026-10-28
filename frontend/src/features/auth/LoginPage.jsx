import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';

export function LoginPage() {
  const { accessToken, setAccessToken, setUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (accessToken) {
    return <Navigate to="/transactions" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await api.post('/auth/login', { email, password });
      if (typeof response?.token !== 'string' || !response.token || !response.user) {
        throw new Error('The server returned an invalid login response.');
      }

      setUser(response.user);
      setAccessToken(response.token);
      navigate(location.state?.from?.pathname || '/transactions', { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <section className="content-panel" aria-labelledby="login-title">
        <p className="eyebrow">Welcome back</p>
        <h2 id="login-title">Sign in</h2>
        <p>Sign in to manage your accounts and transactions.</p>
        {error && <p className="form-message error-message" role="alert">{error}</p>}
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              autoComplete="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label>
            Password
            <input
              autoComplete="current-password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          <button className="primary-button" disabled={submitting} type="submit">
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="auth-switch">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </section>
    </div>
  );
}
