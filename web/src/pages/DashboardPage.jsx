import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Card, StatCard } from '../components/ui/Card.jsx';
import { AsyncContent, EmptyState, Skeleton } from '../components/ui/States.jsx';
import { DonutChart } from '../components/charts/DonutChart.jsx';
import { BarChart } from '../components/charts/BarChart.jsx';
import { MonthPicker } from '../components/MonthPicker.jsx';
import { TransactionRow } from '../components/TransactionRow.jsx';
import { formatMoney, formatMonth, toMonthKey, monthBounds } from '../lib/format.js';
import './DashboardPage.css';

export function DashboardPage() {
  const { currency } = useAuth();
  const [month, setMonth] = useState(toMonthKey);

  const overview = useApi('/api/reports/overview', { query: { month }, deps: [month] });
  const { start, end } = monthBounds(month);
  const recent = useApi('/api/transactions', {
    query: { limit: 6, from: start, to: end },
    deps: [month],
  });

  const money = (cents) => formatMoney(cents, { currency });
  const wholeMoney = (cents) => formatMoney(cents, { currency, whole: true });
  const data = overview.data;

  return (
    <div className="dashboard">
      <div className="dashboard__toolbar">
        <div>
          <h2 className="dashboard__title">{formatMonth(month)}</h2>
          <p className="dashboard__subtitle">
            {data
              ? `${data.transactionCount} transaction${data.transactionCount === 1 ? '' : 's'} recorded`
              : ' '}
          </p>
        </div>
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      <AsyncContent
        loading={overview.loading && !data}
        error={overview.error}
        onRetry={overview.refresh}
        skeleton={<Skeleton rows={4} height={96} />}
      >
        {data && (
          <>
            <div className="dashboard__stats">
              <StatCard
                label="Total balance"
                value={wholeMoney(data.totalBalance)}
                hint="across active accounts"
              />
              <StatCard
                label="Money in"
                value={wholeMoney(data.income)}
                tone="up-good"
                hint={formatMonth(data.previousMonth.month, { short: true })}
                change={percentChange(data.income, data.previousMonth.income)}
              />
              <StatCard
                label="Money out"
                value={wholeMoney(data.expenses)}
                tone="up-bad"
                change={data.expensesChange}
                hint={`vs ${formatMonth(data.previousMonth.month, { short: true })}`}
              />
              <StatCard
                label="Kept this month"
                value={wholeMoney(data.net)}
                hint={
                  data.savingsRate === null
                    ? 'no income recorded'
                    : `${data.savingsRate}% of income`
                }
              />
            </div>

            <div className="dashboard__grid">
              <Card
                title="Where it went"
                subtitle={`Top categories in ${formatMonth(month, { short: true })}`}
              >
                {data.topCategories.length === 0 ? (
                  <EmptyState
                    title="No spending yet"
                    message="Log an expense and the split will appear here."
                    action={
                      <Link className="btn btn--primary btn--md" to="/transactions">
                        Add a transaction
                      </Link>
                    }
                  />
                ) : (
                  <DonutChart
                    data={data.topCategories.map((c) => ({
                      label: c.name,
                      value: c.total,
                      color: c.color,
                    }))}
                    centerLabel="Total spent"
                    centerValue={money(data.expenses)}
                    formatValue={money}
                  />
                )}
              </Card>

              <Card title="Six month trend" subtitle="Income against spending">
                <BarChart
                  data={data.trend}
                  formatValue={(cents) => formatMoney(cents, { currency, compact: true })}
                  formatLabel={(m) => formatMonth(m, { short: true })}
                />
              </Card>
            </div>

            <Card
              title="Recent activity"
              actions={
                <Link className="btn btn--ghost btn--sm" to="/transactions">
                  View all
                </Link>
              }
              padded={false}
            >
              <AsyncContent
                loading={recent.loading}
                error={recent.error}
                onRetry={recent.refresh}
                isEmpty={recent.data?.items.length === 0}
                skeleton={<Skeleton rows={4} />}
                empty={
                  <EmptyState
                    title="Nothing logged this month"
                    message="Transactions you add will show up here."
                  />
                }
              >
                <ul className="dashboard__list">
                  {recent.data?.items.map((transaction) => (
                    <TransactionRow
                      key={transaction.id}
                      transaction={transaction}
                      currency={currency}
                    />
                  ))}
                </ul>
              </AsyncContent>
            </Card>
          </>
        )}
      </AsyncContent>
    </div>
  );
}

/** Percent change, or null when there is no baseline to compare against. */
function percentChange(current, previous) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
