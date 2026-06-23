import { useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Field, Input, Select } from '../components/ui/Field.jsx';
import './SettingsPage.css';

const CURRENCIES = ['LKR', 'INR', 'USD', 'EUR', 'GBP', 'AUD', 'JPY'];

export function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const toast = useToast();

  const [profile, setProfile] = useState({
    name: user?.name ?? '',
    currency: user?.currency ?? 'LKR',
  });
  const [profilePending, setProfilePending] = useState(false);
  const [profileErrors, setProfileErrors] = useState({});

  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [passwordPending, setPasswordPending] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({});

  const [importResult, setImportResult] = useState(null);
  const [importPending, setImportPending] = useState(false);
  const fileInput = useRef(null);

  async function saveProfile(event) {
    event.preventDefault();
    setProfilePending(true);
    setProfileErrors({});
    try {
      await updateProfile(profile);
      toast.success('Profile updated');
    } catch (err) {
      setProfileErrors(err.fieldErrors ?? {});
      if (Object.keys(err.fieldErrors ?? {}).length === 0) toast.error(err.message);
    } finally {
      setProfilePending(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    setPasswordPending(true);
    setPasswordErrors({});
    try {
      await api.post('/api/auth/me/password', passwords);
      setPasswords({ currentPassword: '', newPassword: '' });
      toast.success('Password changed');
    } catch (err) {
      setPasswordErrors(err.fieldErrors ?? {});
      if (Object.keys(err.fieldErrors ?? {}).length === 0) toast.error(err.message);
    } finally {
      setPasswordPending(false);
    }
  }

  async function exportEverything() {
    try {
      const { blob, filename } = await api.download('/api/transactions/csv/export', { limit: 200 });
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement('a'), { href: url, download: filename }).click();
      URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function importCsv(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportPending(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const result = await api.post('/api/transactions/csv/import?createMissing=true', text, {
        raw: true,
        headers: { 'Content-Type': 'text/csv' },
      });
      setImportResult({ ok: true, ...result });
      toast.success(`Imported ${result.imported} transaction${result.imported === 1 ? '' : 's'}`);
    } catch (err) {
      // The API rejects the whole file if any row fails, and returns which ones.
      setImportResult({ ok: false, message: err.message, errors: err.details?.errors ?? [] });
      toast.error('Import rejected — nothing was written');
    } finally {
      setImportPending(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  return (
    <div className="settings">
      <Card title="Profile" subtitle="Your name and the currency amounts are shown in">
        <form className="settings__form" onSubmit={saveProfile} noValidate>
          <Field label="Name" error={profileErrors.name}>
            {(props) => (
              <Input
                {...props}
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
            )}
          </Field>

          <Field label="Email">
            {(props) => <Input {...props} value={user?.email ?? ''} disabled />}
          </Field>

          <Field label="Currency" error={profileErrors.currency}>
            {(props) => (
              <Select
                {...props}
                value={profile.currency}
                onChange={(e) => setProfile({ ...profile, currency: e.target.value })}
              >
                {CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <div className="settings__actions">
            <Button type="submit" variant="primary" loading={profilePending}>
              Save profile
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Appearance">
        <Field label="Theme">
          {(props) => (
            <Select {...props} value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </Select>
          )}
        </Field>
      </Card>

      <Card title="Password" subtitle="At least 10 characters — length beats complexity">
        <form className="settings__form" onSubmit={changePassword} noValidate>
          <Field label="Current password" error={passwordErrors.currentPassword}>
            {(props) => (
              <Input
                {...props}
                type="password"
                autoComplete="current-password"
                value={passwords.currentPassword}
                onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
              />
            )}
          </Field>

          <Field label="New password" error={passwordErrors.newPassword}>
            {(props) => (
              <Input
                {...props}
                type="password"
                autoComplete="new-password"
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
              />
            )}
          </Field>

          <div className="settings__actions">
            <Button type="submit" variant="primary" loading={passwordPending}>
              Change password
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Your data" subtitle="Everything lives in a SQLite file you own">
        <div className="settings__data">
          <div className="settings__data-row">
            <div>
              <p className="settings__data-title">Export transactions</p>
              <p className="settings__data-hint">A CSV you can open in any spreadsheet.</p>
            </div>
            <Button onClick={exportEverything}>Download CSV</Button>
          </div>

          <div className="settings__data-row">
            <div>
              <p className="settings__data-title">Import transactions</p>
              <p className="settings__data-hint">
                Columns: date, account, category, direction, amount, payee, note. Unknown accounts
                and categories are created. If any row is invalid, nothing is imported.
              </p>
            </div>
            <>
              <input
                ref={fileInput}
                type="file"
                accept=".csv,text/csv"
                onChange={importCsv}
                className="sr-only"
                id="csv-import"
              />
              <Button loading={importPending} onClick={() => fileInput.current?.click()}>
                Choose a file
              </Button>
            </>
          </div>

          {importResult && (
            <div
              className={`settings__import ${importResult.ok ? 'is-ok' : 'is-error'}`}
              role="status"
            >
              {importResult.ok ? (
                <p>
                  Imported {importResult.imported} of {importResult.total} rows
                  {importResult.accountsToCreate?.length > 0 &&
                    `, created accounts: ${importResult.accountsToCreate.join(', ')}`}
                  .
                </p>
              ) : (
                <>
                  <p>{importResult.message}</p>
                  <ul className="settings__import-errors">
                    {importResult.errors.slice(0, 8).map((problem) => (
                      <li key={`${problem.line}-${problem.message}`}>
                        Line {problem.line}: {problem.message}
                      </li>
                    ))}
                    {importResult.errors.length > 8 && (
                      <li>…and {importResult.errors.length - 8} more</li>
                    )}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
