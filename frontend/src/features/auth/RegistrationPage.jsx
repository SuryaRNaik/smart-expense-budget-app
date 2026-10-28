import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';

export function RegistrationPage() {
  const { accessToken } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);

  if (accessToken) {
    return <Navigate to="/transactions" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await api.post('/auth/register', { name, email, password });
      setRegistered(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <section className="content-panel" aria-labelledby="registration-title">
        <p className="eyebrow">Get started</p>
        <h2 id="registration-title">Create your account</h2>
        <p>Register to start managing your accounts and spending.</p>
        {error && <p className="form-message error-message" role="alert">{error}</p>}
        {registered ? (
          <div className="form-message success-message" role="status">
            Registration successful. <Link to="/login">Sign in</Link> to continue.
          </div>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            <label>
              Name
              <input
                autoComplete="name"
                maxLength={100}
                name="name"
                onChange={(event) => setName(event.target.value)}
                required
                value={name}
              />
            </label>
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
                autoComplete="new-password"
                minLength={8}
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>
            <button className="primary-button" disabled={submitting} type="submit">
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        )}
        {!registered && (
          <p className="auth-switch">
            Already registered? <Link to="/login">Sign in</Link>
          </p>
        )}
      </section>
    </div>
  );
}
