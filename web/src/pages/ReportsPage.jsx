import { useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Input, Select } from '../components/ui/Field.jsx';
import { AsyncContent, EmptyState, Skeleton } from '../components/ui/States.jsx';
import { DonutChart } from '../components/charts/DonutChart.jsx';
import { BarChart } from '../components/charts/BarChart.jsx';
import { Sparkline } from '../components/charts/Sparkline.jsx';
import { formatMoney, formatMonth, formatDay, toMonthKey, monthBounds, addMonthKey } from '../lib/format.js';
import './ReportsPage.css';

const PRESETS = [
  ['this-month', 'This month'],
  ['last-month', 'Last month'],
  ['last-3', 'Last 3 months'],
  ['last-12', 'Last 12 months'],
  ['custom', 'Custom range'],
];

function presetRange(preset) {
  const now = toMonthKey();
  switch (preset) {
    case 'last-month': {
      const previous = addMonthKey(now, -1);
      return monthBounds(previous);
    }
    case 'last-3':
      return { start: monthBounds(addMonthKey(now, -2)).start, end: monthBounds(now).end };
    case 'last-12':
      return { start: monthBounds(addMonthKey(now, -11)).start, end: monthBounds(now).end };
    case 'this-month':
    default:
      return monthBounds(now);
  }
}

export function ReportsPage() {
  const { currency } = useAuth();

  const [preset, setPreset] = useState('this-month');
  const [range, setRange] = useState(() => presetRange('this-month'));
  const [direction, setDirection] = useState('out');

  const query = { from: range.start, to: range.end, direction };

  const byCategory = useApi('/api/reports/by-category', { query, deps: [range.start, range.end, direction] });
  const trend = useApi('/api/reports/trend', { query: { months: 12 } });
  const daily = useApi('/api/reports/daily', {
    query: { from: range.start, to: range.end },
    deps: [range.start, range.end],
  });
  const payees = useApi('/api/reports/top-payees', {
    query: { from: range.start, to: range.end, limit: 8 },
    deps: [range.start, range.end],
  });

  const money = (cents) => formatMoney(cents, { currency });

  function choosePreset(value) {
    setPreset(value);
    if (value !== 'custom') setRange(presetRange(value));
  }

  return (
    <div className="reports">
      <div className="reports__controls">
        <Select value={preset} onChange={(e) => choosePreset(e.target.value)} aria-label="Date range preset">
          {PRESETS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>

        {preset === 'custom' && (
          <>
            <Input
              type="date"
              value={range.start}
              onChange={(e) => setRange({ ...range, start: e.target.value })}
              aria-label="From date"
            />
            <Input
              type="date"
              value={range.end}
              onChange={(e) => setRange({ ...range, end: e.target.value })}
              aria-label="To date"
            />
          </>
        )}

        <Select value={direction} onChange={(e) => setDirection(e.target.value)} aria-label="Direction">
          <option value="out">Spending</option>
          <option value="in">Income</option>
        </Select>

        <span className="reports__range">
          {formatDay(range.start)} — {formatDay(range.end)}
        </span>
      </div>

      <div className="reports__grid">
        <Card
          title={direction === 'out' ? 'Spending by category' : 'Income by category'}
          subtitle={byCategory.data ? `${money(byCategory.data.total)} in total` : undefined}
          className="reports__wide"
        >
          <AsyncContent
            loading={byCategory.loading && !byCategory.data}
            error={byCategory.error}
            onRetry={byCategory.refresh}
            isEmpty={byCategory.data?.categories.length === 0}
            skeleton={<Skeleton rows={2} height={80} />}
            empty={<EmptyState title="Nothing in this range" message="Try a wider date range." />}
          >
            {byCategory.data && (
              <DonutChart
                data={byCategory.data.categories.map((c) => ({
                  label: c.name,
                  value: c.total,
                  color: c.color,
                }))}
                total={byCategory.data.total}
                centerLabel={direction === 'out' ? 'Total spent' : 'Total earned'}
                centerValue={money(byCategory.data.total)}
                formatValue={money}
              />
            )}
          </AsyncContent>
        </Card>

        <Card title="Daily spending" subtitle={daily.data ? `${money(daily.data.dailyAverage)} a day on average` : undefined}>
          <AsyncContent
            loading={daily.loading && !daily.data}
            error={daily.error}
            onRetry={daily.refresh}
            skeleton={<Skeleton rows={1} height={72} />}
          >
            {daily.data && (
              <>
                <Sparkline values={daily.data.days.map((d) => d.total)} label="Daily spending" color="var(--negative)" />
                <div className="reports__spark-meta">
                  <span>{formatDay(range.start, { short: true })}</span>
                  <span>{money(daily.data.total)} total</span>
                  <span>{formatDay(range.end, { short: true })}</span>
                </div>
              </>
            )}
          </AsyncContent>
        </Card>

        <Card title="Top payees" subtitle="Where the money actually went">
          <AsyncContent
            loading={payees.loading && !payees.data}
            error={payees.error}
            onRetry={payees.refresh}
            isEmpty={payees.data?.payees.length === 0}
            skeleton={<Skeleton rows={5} height={28} />}
            empty={<EmptyState title="No named payees" message="Fill in the 'paid to' field to see this." />}
          >
            <ol className="reports__payees">
              {payees.data?.payees.map((payee, index) => (
                <li key={payee.payee} className="reports__payee">
                  <span className="reports__payee-rank">{index + 1}</span>
                  <span className="reports__payee-name">{payee.payee}</span>
                  <span className="reports__payee-count">×{payee.transaction_count}</span>
                  <span className="reports__payee-total">{money(payee.total)}</span>
                </li>
              ))}
            </ol>
          </AsyncContent>
        </Card>

        <Card title="Twelve month history" subtitle="Income against spending" className="reports__wide">
          <AsyncContent
            loading={trend.loading && !trend.data}
            error={trend.error}
            onRetry={trend.refresh}
            skeleton={<Skeleton rows={1} height={180} />}
          >
            {trend.data && (
              <BarChart
                data={trend.data.months}
                formatValue={(cents) => formatMoney(cents, { currency, compact: true })}
                formatLabel={(m) => formatMonth(m, { short: true })}
              />
            )}
          </AsyncContent>
        </Card>
      </div>
    </div>
  );
}
