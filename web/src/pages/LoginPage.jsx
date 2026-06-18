import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Field, Input } from '../components/ui/Field.jsx';
import { Button } from '../components/ui/Button.jsx';
import './AuthPage.css';

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  async function onSubmit(event) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await signIn(form);
      // Return them to whatever they were trying to reach before being bounced.
      navigate(location.state?.from?.pathname ?? '/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth__panel">
        <div className="auth__brand">
          <span className="auth__logo" aria-hidden="true">
            Rs
          </span>
        </div>

        <h1 className="auth__title">Welcome back</h1>
        <p className="auth__subtitle">Sign in to pick up where your ledger left off.</p>

        <form className="auth__form" onSubmit={onSubmit} noValidate>
          {error && (
            <div className="auth__error" role="alert">
              {error}
            </div>
          )}

          <Field label="Email">
            {(props) => (
              <Input
                {...props}
                type="email"
                value={form.email}
                onChange={update('email')}
                autoComplete="email"
                autoFocus
                placeholder="you@example.com"
              />
            )}
          </Field>

          <Field label="Password">
            {(props) => (
              <Input
                {...props}
                type="password"
                value={form.password}
                onChange={update('password')}
                autoComplete="current-password"
                placeholder="••••••••••"
              />
            )}
          </Field>

          <Button type="submit" variant="primary" loading={pending} className="auth__submit">
            Sign in
          </Button>
        </form>

        <p className="auth__switch">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
