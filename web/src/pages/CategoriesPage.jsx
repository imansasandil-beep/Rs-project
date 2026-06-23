import { useState } from 'react';
import { api } from '../lib/api.js';
import { useApi } from '../hooks/useApi.js';
import { useToast } from '../components/ui/Toast.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Field, Input, Select } from '../components/ui/Field.jsx';
import { AsyncContent, EmptyState, Skeleton } from '../components/ui/States.jsx';
import './CategoriesPage.css';

const SWATCHES = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#0ea5e9',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#d946ef',
  '#ec4899',
  '#64748b',
  '#94a3b8',
];

const BLANK = { name: '', kind: 'expense', color: '#3b82f6' };

export function CategoriesPage() {
  const toast = useToast();

  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);

  const categories = useApi('/api/categories', {
    query: { includeArchived: showArchived ? 'true' : 'false' },
    deps: [showArchived],
  });

  function openForm(category = null) {
    setEditing(category);
    setForm(category ? { name: category.name, kind: category.kind, color: category.color } : BLANK);
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
        // `kind` is immutable server-side — reclassifying would reinterpret
        // every transaction already filed under it.
        await api.patch(`/api/categories/${editing.id}`, { name: form.name, color: form.color });
        toast.success('Category updated');
      } else {
        await api.post('/api/categories', form);
        toast.success('Category added');
      }
      setFormOpen(false);
      categories.refresh();
    } catch (err) {
      const fields = err.fieldErrors ?? {};
      setFieldErrors(fields);
      if (Object.keys(fields).length === 0) setError(err.message);
    } finally {
      setPending(false);
    }
  }

  async function toggleArchive(category) {
    try {
      await api.put(`/api/categories/${category.id}/archived`, { archived: !category.archivedAt });
      toast.success(
        category.archivedAt ? `${category.name} restored` : `${category.name} archived`
      );
      categories.refresh();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function remove(category) {
    try {
      await api.del(`/api/categories/${category.id}`);
      toast.success('Category deleted');
      categories.refresh();
    } catch (err) {
      toast.error(err.message);
    }
  }

  const list = categories.data?.categories ?? [];
  const groups = [
    ['expense', 'Spending', list.filter((c) => c.kind === 'expense')],
    ['income', 'Income', list.filter((c) => c.kind === 'income')],
  ];

  return (
    <div className="categories">
      <div className="categories__header">
        <p className="categories__intro">
          Categories drive every report. Archive the ones you stop using — deleting is only possible
          while nothing is filed under them.
        </p>

        <div className="categories__header-actions">
          <label className="categories__toggle">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            Show archived
          </label>
          <Button variant="primary" onClick={() => openForm()}>
            Add category
          </Button>
        </div>
      </div>

      <AsyncContent
        loading={categories.loading && !categories.data}
        error={categories.error}
        onRetry={categories.refresh}
        isEmpty={list.length === 0}
        skeleton={<Skeleton rows={6} />}
        empty={
          <Card>
            <EmptyState title="No categories" message="Add one to start labelling your spending." />
          </Card>
        }
      >
        <div className="categories__groups">
          {groups.map(([kind, label, items]) => (
            <Card
              key={kind}
              title={label}
              subtitle={`${items.length} categor${items.length === 1 ? 'y' : 'ies'}`}
              padded={false}
            >
              {items.length === 0 ? (
                <EmptyState title={`No ${label.toLowerCase()} categories`} />
              ) : (
                <ul className="categories__list">
                  {items.map((category) => (
                    <li
                      key={category.id}
                      className={`category ${category.archivedAt ? 'is-archived' : ''}`}
                    >
                      <span
                        className="category__swatch"
                        style={{ background: category.color }}
                        aria-hidden="true"
                      />
                      <span className="category__name">{category.name}</span>
                      <span className="category__count">
                        {category.transactionCount} use{category.transactionCount === 1 ? '' : 's'}
                      </span>

                      <span className="category__actions">
                        <button
                          type="button"
                          className="category__action"
                          onClick={() => openForm(category)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="category__action"
                          onClick={() => toggleArchive(category)}
                        >
                          {category.archivedAt ? 'Restore' : 'Archive'}
                        </button>
                        {category.transactionCount === 0 && (
                          <button
                            type="button"
                            className="category__action category__action--danger"
                            onClick={() => remove(category)}
                          >
                            Delete
                          </button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      </AsyncContent>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit category' : 'Add a category'}
        footer={
          <>
            <Button onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={save} loading={pending}>
              {editing ? 'Save changes' : 'Add category'}
            </Button>
          </>
        }
      >
        <form className="categories__form" onSubmit={save} noValidate>
          {error && (
            <div className="categories__error" role="alert">
              {error}
            </div>
          )}

          <Field label="Name" required error={fieldErrors.name}>
            {(props) => (
              <Input
                {...props}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Groceries"
                autoFocus
              />
            )}
          </Field>

          <Field
            label="Kind"
            required
            error={fieldErrors.kind}
            hint={
              editing
                ? 'Kind cannot change once transactions are filed under a category.'
                : undefined
            }
          >
            {(props) => (
              <Select
                {...props}
                value={form.kind}
                disabled={Boolean(editing)}
                onChange={(e) => setForm({ ...form, kind: e.target.value })}
              >
                <option value="expense">Spending</option>
                <option value="income">Income</option>
              </Select>
            )}
          </Field>

          <Field label="Colour" error={fieldErrors.color}>
            {() => (
              <div className="swatches" role="radiogroup" aria-label="Category colour">
                {SWATCHES.map((color) => (
                  <button
                    key={color}
                    type="button"
                    role="radio"
                    aria-checked={form.color === color}
                    aria-label={color}
                    className={`swatch ${form.color === color ? 'is-selected' : ''}`}
                    style={{ background: color }}
                    onClick={() => setForm({ ...form, color })}
                  />
                ))}
              </div>
            )}
          </Field>
        </form>
      </Modal>
    </div>
  );
}
