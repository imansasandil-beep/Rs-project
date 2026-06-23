import { useState } from 'react';
import { api } from '../lib/api.js';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Modal, ConfirmDialog } from '../components/ui/Modal.jsx';
import { Field, Input, Select, AmountInput } from '../components/ui/Field.jsx';
import { AsyncContent, EmptyState, Skeleton } from '../components/ui/States.jsx';
import { formatMoney, centsToInput, currencySymbol, ACCOUNT_TYPE_LABELS } from '../lib/format.js';
import './AccountsPage.css';

const BLANK = { name: '', type: 'bank', openingBalance: '0' };

export function AccountsPage() {
  const { currency } = useAuth();
  const toast = useToast();

  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const accounts = useApi('/api/accounts', {
    query: { includeArchived: showArchived ? 'true' : 'false' },
    deps: [showArchived],
  });

  function openForm(account = null) {
    setEditing(account);
    setForm(
      account
        ? {
            name: account.name,
            type: account.type,
            openingBalance: centsToInput(account.openingBalance),
          }
        : BLANK
    );
    setFieldErrors({});
    setError(null);
    setFormOpen(true);
  }

  async function save(event) {
    event?.preventDefault();
    setPending(true);
    setFieldErrors({});
    setError(null);
    try {
      if (editing) {
        await api.patch(`/api/accounts/${editing.id}`, form);
        toast.success('Account updated');
      } else {
        await api.post('/api/accounts', form);
        toast.success('Account added');
      }
      setFormOpen(false);
      accounts.refresh();
    } catch (err) {
      const fields = err.fieldErrors ?? {};
      setFieldErrors(fields);
      if (Object.keys(fields).length === 0) setError(err.message);
    } finally {
      setPending(false);
    }
  }

  async function toggleArchive(account) {
    try {
      await api.put(`/api/accounts/${account.id}/archived`, { archived: !account.archivedAt });
      toast.success(account.archivedAt ? `${account.name} restored` : `${account.name} archived`);
      accounts.refresh();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function confirmDelete() {
    setPending(true);
    try {
      await api.del(`/api/accounts/${deleting.id}`);
      toast.success('Account deleted');
      setDeleting(null);
      accounts.refresh();
    } catch (err) {
      // The API refuses to delete an account with history — surface that
      // instead of a generic failure, since archiving is the way forward.
      toast.error(err.message);
      setDeleting(null);
    } finally {
      setPending(false);
    }
  }

  const list = accounts.data?.accounts ?? [];

  return (
    <div className="accounts">
      <div className="accounts__header">
        {accounts.data && (
          <div>
            <p className="accounts__total-label">Combined worth</p>
            <p className="accounts__total">
              {formatMoney(accounts.data.totalBalance, { currency })}
            </p>
          </div>
        )}

        <div className="accounts__header-actions">
          <label className="accounts__toggle">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            Show archived
          </label>
          <Button variant="primary" onClick={() => openForm()}>
            Add account
          </Button>
        </div>
      </div>

      <AsyncContent
        loading={accounts.loading && !accounts.data}
        error={accounts.error}
        onRetry={accounts.refresh}
        isEmpty={list.length === 0}
        skeleton={<Skeleton rows={3} height={110} />}
        empty={
          <Card>
            <EmptyState
              title="No accounts yet"
              message="Add the wallet, bank account or card you want to track."
              action={
                <Button variant="primary" onClick={() => openForm()}>
                  Add account
                </Button>
              }
            />
          </Card>
        }
      >
        <div className="accounts__grid">
          {list.map((account) => (
            <article
              key={account.id}
              className={`account ${account.archivedAt ? 'is-archived' : ''}`}
            >
              <header className="account__header">
                <div>
                  <h3 className="account__name">{account.name}</h3>
                  <p className="account__type">
                    {ACCOUNT_TYPE_LABELS[account.type] ?? account.type}
                    {account.archivedAt && <span className="account__badge">Archived</span>}
                  </p>
                </div>
              </header>

              <p className={`account__balance ${account.balance < 0 ? 'is-negative' : ''}`}>
                {formatMoney(account.balance, { currency })}
              </p>

              <p className="account__meta">
                {account.transactionCount} transaction{account.transactionCount === 1 ? '' : 's'}
                {account.openingBalance !== 0 && (
                  <> · opened at {formatMoney(account.openingBalance, { currency })}</>
                )}
              </p>

              <footer className="account__actions">
                <Button size="sm" variant="ghost" onClick={() => openForm(account)}>
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => toggleArchive(account)}>
                  {account.archivedAt ? 'Restore' : 'Archive'}
                </Button>
                {account.transactionCount === 0 && (
                  <Button size="sm" variant="ghost" onClick={() => setDeleting(account)}>
                    Delete
                  </Button>
                )}
              </footer>
            </article>
          ))}
        </div>
      </AsyncContent>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit account' : 'Add an account'}
        footer={
          <>
            <Button onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={save} loading={pending}>
              {editing ? 'Save changes' : 'Add account'}
            </Button>
          </>
        }
      >
        <form className="accounts__form" onSubmit={save} noValidate>
          {error && (
            <div className="accounts__error" role="alert">
              {error}
            </div>
          )}

          <Field label="Name" required error={fieldErrors.name}>
            {(props) => (
              <Input
                {...props}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Everyday account"
                autoFocus
              />
            )}
          </Field>

          <Field label="Type" required error={fieldErrors.type}>
            {(props) => (
              <Select
                {...props}
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field
            label="Opening balance"
            error={fieldErrors.openingBalance}
            hint="What was in this account before you started logging. Negative is fine for a card."
          >
            {(props) => (
              <AmountInput
                {...props}
                currencySymbol={currencySymbol(currency)}
                value={form.openingBalance}
                onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
              />
            )}
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        pending={pending}
        title={`Delete ${deleting?.name}?`}
        message="This account has no transactions, so nothing in your history will change."
      />
    </div>
  );
}
