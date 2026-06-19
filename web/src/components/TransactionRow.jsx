import { formatMoney, formatRelativeDay } from '../lib/format.js';
import './TransactionRow.css';

/**
 * One line of the ledger. Transfers are rendered in a muted style with their own
 * glyph so they never read as income or spending at a glance.
 */
export function TransactionRow({ transaction, currency, onEdit, onDelete }) {
  const { direction, amount, category, account, payee, note, occurredOn, isTransfer } = transaction;
  const incoming = direction === 'in';

  return (
    <li className={`txn ${isTransfer ? 'txn--transfer' : ''}`}>
      <span
        className="txn__marker"
        style={{ background: isTransfer ? 'var(--text-subtle)' : (category?.color ?? 'var(--border-strong)') }}
        aria-hidden="true"
      />

      <div className="txn__main">
        <span className="txn__title">{payee || category?.name || (isTransfer ? 'Transfer' : 'Uncategorized')}</span>
        <span className="txn__meta">
          {isTransfer ? 'Transfer' : (category?.name ?? 'Uncategorized')}
          <span className="txn__dot" aria-hidden="true">
            ·
          </span>
          {account.name}
          {note && (
            <>
              <span className="txn__dot" aria-hidden="true">
                ·
              </span>
              <span className="txn__note">{note}</span>
            </>
          )}
        </span>
      </div>

      <time className="txn__date" dateTime={occurredOn}>
        {formatRelativeDay(occurredOn)}
      </time>

      <span className={`txn__amount ${incoming ? 'is-in' : 'is-out'}`}>
        {incoming ? '+' : '−'}
        {formatMoney(amount, { currency }).replace(/^[+-]/, '')}
      </span>

      {(onEdit || onDelete) && (
        <span className="txn__actions">
          {onEdit && !isTransfer && (
            <button type="button" className="txn__action" onClick={() => onEdit(transaction)} aria-label={`Edit ${payee || 'transaction'}`}>
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M11.5 2.5 13.5 4.5 5.5 12.5 2.5 13.5 3.5 10.5z" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button type="button" className="txn__action txn__action--danger" onClick={() => onDelete(transaction)} aria-label={`Delete ${payee || 'transaction'}`}>
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5 5 13h6l.5-8.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </span>
      )}
    </li>
  );
}
