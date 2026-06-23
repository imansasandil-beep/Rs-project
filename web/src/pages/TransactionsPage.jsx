import { useState, useMemo } from 'react';
import { api } from '../lib/api.js';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { useDebounced } from '../hooks/useDebounced.js';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input, Select } from '../components/ui/Field.jsx';
import { AsyncContent, EmptyState, Skeleton } from '../components/ui/States.jsx';
import { ConfirmDialog } from '../components/ui/Modal.jsx';
import { TransactionRow } from '../components/TransactionRow.jsx';
import { TransactionForm } from '../components/TransactionForm.jsx';
import { formatMoney } from '../lib/format.js';
import './TransactionsPage.css';

const PAGE_SIZE = 25;

const BLANK_FILTERS = {
  search: '',
  accountId: '',
  categoryId: '',
  direction: '',
  from: '',
  to: '',
};

export function TransactionsPage() {
  const { currency } = useAuth();
  const toast = useToast();

  const [filters, setFilters] = useState(BLANK_FILTERS);
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deletePending, setDeletePending] = useState(false);

  // Typing a search term should not fire a request per keystroke.
  const search = useDebounced(filters.search, 300);

  const accounts = useApi('/api/accounts', { query: { includeArchived: 'true' } });
  const categories = useApi('/api/categories', { query: { includeArchived: 'true' } });

  const query = useMemo(
    () => ({
      search: search || undefined,
      accountId: filters.accountId || undefined,
      categoryId: filters.categoryId || undefined,
      direction: filters.direction || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
    [
      search,
      filters.accountId,
      filters.categoryId,
      filters.direction,
      filters.from,
      filters.to,
      page,
    ]
  );

  const transactions = useApi('/api/transactions', { query, deps: [query] });

  const activeFilterCount = Object.entries(filters).filter(([, value]) => value !== '').length;

  function update(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
    setPage(0); // A filter change invalidates whatever page we were on.
  }

  function refreshAll() {
    transactions.refresh();
    accounts.refresh();
  }

  async function confirmDelete() {
    setDeletePending(true);
    try {
      await api.del(`/api/transactions/${deleting.id}`);
      toast.success(deleting.isTransfer ? 'Transfer deleted' : 'Transaction deleted');
      setDeleting(null);
      refreshAll();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeletePending(false);
    }
  }

  async function exportCsv() {
    try {
      const { blob, filename } = await api.download('/api/transactions/csv/export', query);
      const url = URL.createObjectURL(blob);
      const link = Object.assign(document.createElement('a'), { href: url, download: filename });
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch (err) {
      toast.error(err.message);
    }
  }

  const data = transactions.data;
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return (
    <div className="txns">
      <div className="txns__header">
        <div className="txns__totals">
          {data && (
            <>
              <span className="txns__total">
                <span className="txns__total-label">In</span>
                <span className="txns__total-value is-in">
                  {formatMoney(data.totals.inflow, { currency })}
                </span>
              </span>
              <span className="txns__total">
                <span className="txns__total-label">Out</span>
                <span className="txns__total-value is-out">
                  {formatMoney(data.totals.outflow, { currency })}
                </span>
              </span>
              <span className="txns__total">
                <span className="txns__total-label">Net</span>
                <span className={`txns__total-value ${data.totals.net >= 0 ? 'is-in' : 'is-out'}`}>
                  {formatMoney(data.totals.net, { currency, showSign: true })}
                </span>
              </span>
            </>
          )}
        </div>

        <div className="txns__header-actions">
          <Button onClick={exportCsv}>Export CSV</Button>
          <Button
            variant="primary"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Add transaction
          </Button>
        </div>
      </div>

      <Card padded={false}>
        <div className="txns__filters">
          <Input
            type="search"
            className="txns__search"
            placeholder="Search payee or note…"
            value={filters.search}
            onChange={(e) => update('search', e.target.value)}
            aria-label="Search transactions"
          />

          <Select
            value={filters.accountId}
            onChange={(e) => update('accountId', e.target.value)}
            aria-label="Filter by account"
          >
            <option value="">All accounts</option>
            {accounts.data?.accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>

          <Select
            value={filters.categoryId}
            onChange={(e) => update('categoryId', e.target.value)}
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {categories.data?.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>

          <Select
            value={filters.direction}
            onChange={(e) => update('direction', e.target.value)}
            aria-label="Filter by direction"
          >
            <option value="">In and out</option>
            <option value="in">Money in</option>
            <option value="out">Money out</option>
          </Select>

          <Input
            type="date"
            value={filters.from}
            onChange={(e) => update('from', e.target.value)}
            aria-label="From date"
          />
          <Input
            type="date"
            value={filters.to}
            onChange={(e) => update('to', e.target.value)}
            aria-label="To date"
          />

          {activeFilterCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setFilters(BLANK_FILTERS);
                setPage(0);
              }}
            >
              Clear {activeFilterCount}
            </Button>
          )}
        </div>

        <AsyncContent
          loading={transactions.loading && !data}
          error={transactions.error}
          onRetry={transactions.refresh}
          isEmpty={data?.items.length === 0}
          skeleton={<Skeleton rows={8} />}
          empty={
            <EmptyState
              title={
                activeFilterCount > 0 ? 'Nothing matches those filters' : 'Your ledger is empty'
              }
              message={
                activeFilterCount > 0
                  ? 'Try widening the date range or clearing a filter.'
                  : 'Add your first transaction to start tracking where the money goes.'
              }
              action={
                activeFilterCount > 0 ? (
                  <Button onClick={() => setFilters(BLANK_FILTERS)}>Clear filters</Button>
                ) : (
                  <Button variant="primary" onClick={() => setFormOpen(true)}>
                    Add transaction
                  </Button>
                )
              }
            />
          }
        >
          <ul className="txns__list">
            {data?.items.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                currency={currency}
                onEdit={(t) => {
                  setEditing(t);
                  setFormOpen(true);
                }}
                onDelete={setDeleting}
              />
            ))}
          </ul>

          {totalPages > 1 && (
            <div className="txns__pager">
              <Button size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="txns__pager-label">
                Page {page + 1} of {totalPages} · {data.total} transactions
              </span>
              <Button size="sm" disabled={!data.hasMore} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </AsyncContent>
      </Card>

      <TransactionForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={refreshAll}
        transaction={editing}
        accounts={accounts.data?.accounts ?? []}
        categories={categories.data?.categories ?? []}
        currency={currency}
      />

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        pending={deletePending}
        title={deleting?.isTransfer ? 'Delete this transfer?' : 'Delete this transaction?'}
        message={
          deleting?.isTransfer
            ? 'Both sides of the transfer will be removed so the accounts stay balanced.'
            : 'This cannot be undone and the account balance will change.'
        }
      />
    </div>
  );
}
