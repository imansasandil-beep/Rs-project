import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Field, Input, Select } from '../components/ui/Field.jsx';
import { Button } from '../components/ui/Button.jsx';
import './AuthPage.css';

const CURRENCIES = [
  ['LKR', 'Sri Lankan rupee (Rs)'],
  ['INR', 'Indian rupee (₹)'],
  ['USD', 'US dollar ($)'],
  ['EUR', 'Euro (€)'],
  ['GBP', 'Pound sterling (£)'],
];

const MIN_PASSWORD_LENGTH = 10;

export function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', currency: 'LKR' });
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [pending, setPending] = useState(false);

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });
  const remaining = MIN_PASSWORD_LENGTH - form.password.length;

  async function onSubmit(event) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});
    try {
      await signUp(form);
      navigate('/', { replace: true });
    } catch (err) {
      // Field-level messages go next to their input; anything else at the top.
      const fields = err.fieldErrors ?? {};
      setFieldErrors(fields);
      if (Object.keys(fields).length === 0) setError(err.message);
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

        <h1 className="auth__title">Start your ledger</h1>
        <p className="auth__subtitle">
          Everything stays in a SQLite file on this machine. No cloud, no sync.
        </p>

        <form className="auth__form" onSubmit={onSubmit} noValidate>
          {error && (
            <div className="auth__error" role="alert">
              {error}
            </div>
          )}

          <Field label="Name" error={fieldErrors.name}>
            {(props) => (
              <Input
                {...props}
                value={form.name}
                onChange={update('name')}
                autoComplete="name"
                autoFocus
                placeholder="Ravi Perera"
              />
            )}
          </Field>

          <Field label="Email" error={fieldErrors.email}>
            {(props) => (
              <Input
                {...props}
                type="email"
                value={form.email}
                onChange={update('email')}
                autoComplete="email"
                placeholder="you@example.com"
              />
            )}
          </Field>

          <Field
            label="Password"
            error={fieldErrors.password}
            hint={
              form.password.length === 0
                ? `At least ${MIN_PASSWORD_LENGTH} characters — a short sentence beats a mangled word.`
                : remaining > 0
                  ? `${remaining} more character${remaining === 1 ? '' : 's'} to go`
                  : 'Long enough'
            }
          >
            {(props) => (
              <Input
                {...props}
                type="password"
                value={form.password}
                onChange={update('password')}
                autoComplete="new-password"
                placeholder="correct horse battery staple"
              />
            )}
          </Field>

          <Field label="Currency" error={fieldErrors.currency}>
            {(props) => (
              <Select {...props} value={form.currency} onChange={update('currency')}>
                {CURRENCIES.map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Button type="submit" variant="primary" loading={pending} className="auth__submit">
            Create account
          </Button>
        </form>

        <p className="auth__switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
