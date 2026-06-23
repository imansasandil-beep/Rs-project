import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from './Button.jsx';
import './Modal.css';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A dialog rendered into a portal so it escapes any parent's overflow or
 * stacking context. While open it traps Tab, closes on Escape, freezes body
 * scroll, and returns focus to whatever opened it.
 */
export function Modal({ open, onClose, title, description, footer, children, size = 'md' }) {
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    // Focus the first control rather than the panel, so typing starts working
    // immediately in the common case of a form.
    const focusables = panelRef.current?.querySelectorAll(FOCUSABLE);
    (focusables?.[0] ?? panelRef.current)?.focus();

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const items = [...(panelRef.current?.querySelectorAll(FOCUSABLE) ?? [])];
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = overflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="modal__backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={panelRef}
        className={`modal modal--${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <header className="modal__header">
          <div>
            <h2 className="modal__title">{title}</h2>
            {description && <p className="modal__description">{description}</p>}
          </div>
          <IconButton label="Close dialog" onClick={onClose}>
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path
                d="m4 4 8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </IconButton>
        </header>

        <div className="modal__body">{children}</div>

        {footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}

/** A Modal preset for destructive confirmations. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Delete',
  pending = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn--secondary btn--md" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--danger btn--md"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <p className="modal__message">{message}</p>
    </Modal>
  );
}
