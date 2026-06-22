import { useState } from 'react';
import { api } from '../lib/api.js';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { Card, StatCard } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Field, Select, AmountInput } from '../components/ui/Field.jsx';
import { AsyncContent, EmptyState, Skeleton } from '../components/ui/States.jsx';
import { ProgressBar } from '../components/charts/Sparkline.jsx';
import { MonthPicker } from '../components/MonthPicker.jsx';
import { formatMoney, formatMonth, toMonthKey, addMonthKey, currencySymbol } from '../lib/format.js';
import './BudgetsPage.css';

export function BudgetsPage() {
  const { currency } = useAuth();
  const toast = useToast();

  const [month, setMonth] = useState(toMonthKey);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ categoryId: '', amount: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);

  const progress = useApi('/api/reports/budget-progress', { query: { month }, deps: [month] });
  const categories = useApi('/api/categories', { query: { kind: 'expense' } });

  const money = (cents) => formatMoney(cents, { currency });
  const wholeMoney = (cents) => formatMoney(cents, { currency, whole: true });
  const data = progress.data;

  async function save(event) {
    event?.preventDefault();
    setPending(true);
    setFieldErrors({});
    setError(null);
    try {
      await api.put('/api/budgets', { categoryId: Number(form.categoryId), month, amount: form.amount });
      toast.success('Budget saved');
      setFormOpen(false);
      progress.refresh();
    } catch (err) {
      const fields = err.fieldErrors ?? {};
      setFieldErrors(fields);
      if (Object.keys(fields).length === 0) setError(err.message);
    } finally {
      setPending(false);
    }
  }

  async function rollover() {
    try {
      const result = await api.post('/api/budgets/rollover', { month });
      toast.success(
        result.copied === 0
          ? `Nothing new to copy from ${formatMonth(addMonthKey(month, -1), { short: true })}`
          : `Copied ${result.copied} budget${result.copied === 1 ? '' : 's'} forward`
      );
      progress.refresh();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function remove(budget) {
    try {
      await api.del(`/api/budgets/${budget.id}`);
      toast.success('Budget removed');
      progress.refresh();
    } catch (err) {
      toast.error(err.message);
    }
  }

  function openForm() {
    const used = new Set((data?.budgets ?? []).map((b) => b.categoryId));
    const available = (categories.data?.categories ?? []).filter((c) => !used.has(c.id));
    setForm({ categoryId: available[0] ? String(available[0].id) : '', amount: '' });
    setFieldErrors({});
    setError(null);
    setFormOpen(true);
  }

  const budgeted = new Set((data?.budgets ?? []).map((b) => b.categoryId));
  const available = (categories.data?.categories ?? []).filter((c) => !budgeted.has(c.id));

  return (
    <div className="budgets">
      <div className="budgets__header">
        <MonthPicker value={month} onChange={setMonth} allowFuture />
        <div className="budgets__header-actions">
          <Button onClick={rollover}>Copy from {formatMonth(addMonthKey(month, -1), { short: true })}</Button>
          <Button variant="primary" onClick={openForm} disabled={available.length === 0}>
            Set a budget
          </Button>
        </div>
      </div>

      <AsyncContent
        loading={progress.loading && !data}
        error={progress.error}
        onRetry={progress.refresh}
        skeleton={<Skeleton rows={4} height={80} />}
      >
        {data && (
          <>
            <div className="budgets__stats">
              <StatCard label="Budgeted" value={wholeMoney(data.totals.budgeted)} />
              <StatCard label="Spent" value={wholeMoney(data.totals.spent)} />
              <StatCard
                label="Left to spend"
                value={wholeMoney(data.totals.remaining)}
                hint={data.totals.remaining < 0 ? 'over budget' : undefined}
              />
              <StatCard
                label="Month elapsed"
                value={`${data.monthElapsedPercent}%`}
                hint="of the days gone"
              />
            </div>

            <Card title="By category" padded={false}>
              {data.budgets.length === 0 ? (
                <EmptyState
                  title={`No budgets for ${formatMonth(month, { short: true })}`}
                  message="Set a cap on a category and Rs will track the spend against it."
                  action={
                    <Button variant="primary" onClick={openForm}>
                      Set a budget
                    </Button>
                  }
                />
              ) : (
                <ul className="budgets__list">
                  {data.budgets.map((budget) => {
                    const status = caption(budget, data.monthElapsedPercent, money);
                    return (
                    <li key={budget.id} className="budget">
                      <div className="budget__bar">
                        <ProgressBar
                          label={budget.category.name}
                          value={budget.spent}
                          max={budget.amount}
                          formatValue={money}
                          caption={status.text}
                          captionTone={status.tone}
                        />
                      </div>
                      <button
                        type="button"
                        className="budget__remove"
                        onClick={() => remove(budget)}
                        aria-label={`Remove the ${budget.category.name} budget`}
                      >
                        Remove
                      </button>
                    </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </>
        )}
      </AsyncContent>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={`Budget for ${formatMonth(month)}`}
        footer={
          <>
            <Button onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={save} loading={pending}>
              Save budget
            </Button>
          </>
        }
      >
        <form className="budgets__form" onSubmit={save} noValidate>
          {error && (
            <div className="budgets__error" role="alert">
              {error}
            </div>
          )}

          <Field label="Category" required error={fieldErrors.categoryId}>
            {(props) => (
              <Select {...props} value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                {available.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Monthly cap" required error={fieldErrors.amount}>
            {(props) => (
              <AmountInput
                {...props}
                currencySymbol={currencySymbol(currency)}
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                autoFocus
              />
            )}
          </Field>
        </form>
      </Modal>
    </div>
  );
}

/**
 * Explains the bar in words, with the tone the message deserves. Pacing matters
 * as much as the total: being at 60% of the cap is fine on the 20th and a
 * problem on the 5th, so a bar still in the green can carry an amber warning.
 */
function caption(budget, elapsedPercent, money) {
  if (budget.overspent) {
    return { text: `Over by ${money(budget.spent - budget.amount)}`, tone: 'over' };
  }
  if (budget.projected > budget.amount) {
    return {
      text: `On track to overspend by ${money(budget.projected - budget.amount)}`,
      tone: 'near',
    };
  }
  if (budget.usedPercent > elapsedPercent + 15) {
    return {
      text: `${budget.usedPercent}% used with ${Math.round(100 - elapsedPercent)}% of the month left`,
      tone: 'near',
    };
  }
  return { text: `${money(budget.remaining)} left`, tone: 'under' };
}
