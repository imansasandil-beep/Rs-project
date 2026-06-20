import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { useToast } from './ui/Toast.jsx';
import { Modal } from './ui/Modal.jsx';
import { Button } from './ui/Button.jsx';
import { Field, Input, Select, Textarea, AmountInput } from './ui/Field.jsx';
import { centsToInput, currencySymbol, toDayKey } from '../lib/format.js';
import './TransactionForm.css';

const BLANK = {
  direction: 'out',
  amount: '',
  accountId: '',
  categoryId: '',
  occurredOn: toDayKey(),
  payee: '',
  note: '',
};

/**
 * Create/edit dialog for a single transaction, plus a transfer mode that posts
 * to the paired-legs endpoint instead.
 */
export function TransactionForm({ open, onClose, onSaved, transaction, accounts, categories, currency }) {
  const toast = useToast();
  const editing = Boolean(transaction);

  const [mode, setMode] = useState('single');
  const [form, setForm] = useState(BLANK);
  const [transfer, setTransfer] = useState({ fromAccountId: '', toAccountId: '', amount: '', occurredOn: toDayKey(), note: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);

  const openAccounts = useMemo(() => accounts.filter((a) => !a.archivedAt), [accounts]);

  // Reset whenever the dialog opens so a previous entry never leaks into a new one.
  useEffect(() => {
    if (!open) return;

    setFieldErrors({});
    setError(null);
    setMode('single');

    if (transaction) {
      setForm({
        direction: transaction.direction,
        amount: centsToInput(transaction.amount),
        accountId: String(transaction.accountId),
        categoryId: transaction.categoryId ? String(transaction.categoryId) : '',
        occurredOn: transaction.occurredOn,
        payee: transaction.payee ?? '',
        note: transaction.note ?? '',
      });
    } else {
      setForm({ ...BLANK, accountId: openAccounts[0] ? String(openAccounts[0].id) : '' });
      setTransfer({
        fromAccountId: openAccounts[0] ? String(openAccounts[0].id) : '',
        toAccountId: openAccounts[1] ? String(openAccounts[1].id) : '',
        amount: '',
        occurredOn: toDayKey(),
        note: '',
      });
    }
  }, [open, transaction, openAccounts]);

  // A category only belongs to one side of the ledger, so the picker follows
  // the direction rather than offering choices the server would reject.
  const selectableCategories = useMemo(
    () => categories.filter((c) => !c.archivedAt && c.kind === (form.direction === 'in' ? 'income' : 'expense')),
    [categories, form.direction]
  );

  useEffect(() => {
    if (form.categoryId && !selectableCategories.some((c) => String(c.id) === form.categoryId)) {
      setForm((current) => ({ ...current, categoryId: '' }));
    }
  }, [selectableCategories, form.categoryId]);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const updateTransfer = (field) => (event) =>
    setTransfer((current) => ({ ...current, [field]: event.target.value }));

  async function onSubmit(event) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});

    try {
      if (mode === 'transfer') {
        await api.post('/api/transactions/transfers', {
          fromAccountId: Number(transfer.fromAccountId),
          toAccountId: Number(transfer.toAccountId),
          amount: transfer.amount,
          occurredOn: transfer.occurredOn,
          note: transfer.note || null,
        });
        toast.success('Transfer recorded');
      } else {
        const payload = {
          accountId: Number(form.accountId),
          categoryId: form.categoryId ? Number(form.categoryId) : null,
          direction: form.direction,
          amount: form.amount,
          occurredOn: form.occurredOn,
          payee: form.payee || null,
          note: form.note || null,
        };

        if (editing) {
          await api.patch(`/api/transactions/${transaction.id}`, payload);
          toast.success('Transaction updated');
        } else {
          await api.post('/api/transactions', payload);
          toast.success('Transaction added');
        }
      }

      onSaved();
      onClose();
    } catch (err) {
      const fields = err.fieldErrors ?? {};
      setFieldErrors(fields);
      if (Object.keys(fields).length === 0) setError(err.message);
    } finally {
      setPending(false);
    }
  }

  const symbol = currencySymbol(currency);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit transaction' : 'Add to the ledger'}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={onSubmit} loading={pending}>
            {editing ? 'Save changes' : 'Add'}
          </Button>
        </>
      }
    >
      <form className="txn-form" onSubmit={onSubmit} noValidate>
        {error && (
          <div className="txn-form__error" role="alert">
            {error}
          </div>
        )}

        {!editing && (
          <div className="txn-form__modes" role="tablist" aria-label="Entry type">
            {[
              ['single', 'Income or expense'],
              ['transfer', 'Transfer between accounts'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={mode === key}
                className={`txn-form__mode ${mode === key ? 'is-active' : ''}`}
                onClick={() => setMode(key)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {mode === 'single' ? (
          <>
            <div className="txn-form__toggle" role="radiogroup" aria-label="Direction">
              {[
                ['out', 'Money out'],
                ['in', 'Money in'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={form.direction === key}
                  className={`txn-form__direction is-${key} ${form.direction === key ? 'is-active' : ''}`}
                  onClick={() => setForm((current) => ({ ...current, direction: key }))}
                >
                  {label}
                </button>
              ))}
            </div>

            <Field label="Amount" required error={fieldErrors.amount}>
              {(props) => (
                <AmountInput
                  {...props}
                  currencySymbol={symbol}
                  value={form.amount}
                  onChange={update('amount')}
                  autoFocus
                />
              )}
            </Field>

            <div className="txn-form__row">
              <Field label="Account" required error={fieldErrors.accountId}>
                {(props) => (
                  <Select {...props} value={form.accountId} onChange={update('accountId')}>
                    {openAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              <Field label="Date" required error={fieldErrors.occurredOn}>
                {(props) => (
                  <Input {...props} type="date" value={form.occurredOn} onChange={update('occurredOn')} />
                )}
              </Field>
            </div>

            <Field label="Category" error={fieldErrors.categoryId}>
              {(props) => (
                <Select {...props} value={form.categoryId} onChange={update('categoryId')}>
                  <option value="">Uncategorized</option>
                  {selectableCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field label={form.direction === 'in' ? 'Received from' : 'Paid to'} error={fieldErrors.payee}>
              {(props) => (
                <Input
                  {...props}
                  value={form.payee}
                  onChange={update('payee')}
                  placeholder={form.direction === 'in' ? 'Employer' : 'Keells'}
                />
              )}
            </Field>

            <Field label="Note" error={fieldErrors.note}>
              {(props) => <Textarea {...props} value={form.note} onChange={update('note')} rows={2} />}
            </Field>
          </>
        ) : (
          <>
            <Field label="Amount" required error={fieldErrors.amount}>
              {(props) => (
                <AmountInput
                  {...props}
                  currencySymbol={symbol}
                  value={transfer.amount}
                  onChange={updateTransfer('amount')}
                  autoFocus
                />
              )}
            </Field>

            <div className="txn-form__row">
              <Field label="From" required error={fieldErrors.fromAccountId}>
                {(props) => (
                  <Select {...props} value={transfer.fromAccountId} onChange={updateTransfer('fromAccountId')}>
                    {openAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              <Field label="To" required error={fieldErrors.toAccountId}>
                {(props) => (
                  <Select {...props} value={transfer.toAccountId} onChange={updateTransfer('toAccountId')}>
                    {openAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>

            <Field label="Date" required error={fieldErrors.occurredOn}>
              {(props) => (
                <Input {...props} type="date" value={transfer.occurredOn} onChange={updateTransfer('occurredOn')} />
              )}
            </Field>

            <Field label="Note" error={fieldErrors.note}>
              {(props) => <Textarea {...props} value={transfer.note} onChange={updateTransfer('note')} rows={2} />}
            </Field>

            <p className="txn-form__hint">
              A transfer is recorded on both accounts and left out of spending reports.
            </p>
          </>
        )}
      </form>
    </Modal>
  );
}
