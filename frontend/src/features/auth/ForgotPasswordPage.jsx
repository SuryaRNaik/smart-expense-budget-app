import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [resetUrl, setResetUrl] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const response = await api.post('/auth/forgot-password', { email });
      setMessage(response.message || 'If an account with that email exists, a password reset link has been sent.');
      if (response.resetToken) {
        setResetUrl(response.resetUrl || `/reset-password?token=${encodeURIComponent(response.resetToken)}`);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <section className="content-panel" aria-labelledby="forgot-password-title">
        <p className="eyebrow">Account recovery</p>
        <h2 id="forgot-password-title">Reset your password</h2>
        <p>Enter the email address for your account and we will send a secure reset link.</p>
        {error && <p className="form-message error-message" role="alert">{error}</p>}
        {message && <p className="form-message success-message" role="status">{message}</p>}
        {resetUrl && (
          <p className="auth-switch">
            <Link to={resetUrl}>Open reset link</Link>
          </p>
        )}
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
          <button className="primary-button" disabled={submitting} type="submit">
            {submitting ? 'Sending reset link…' : 'Send reset link'}
          </button>
        </form>
        <p className="auth-switch">
          <Link to="/login">Back to sign in</Link>
        </p>
      </section>
    </div>
  );
}
