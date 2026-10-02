import { X } from 'lucide-react';
import { type ReactNode, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../../utils/format';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Hides the title visually while keeping it for screen readers. */
  hideTitle?: boolean;
  variant?: 'dialog' | 'drawer';
  wide?: boolean;
  footer?: ReactNode;
  children: ReactNode;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let openModals = 0;

/**
 * An accessible dialog. It traps focus, closes on Escape or a backdrop click,
 * locks page scroll, and returns focus to whatever opened it. On small screens
 * it presents as a bottom sheet.
 */
export function Modal({ open, onClose, title, hideTitle, variant = 'dialog', wide, footer, children }: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.focus();

    openModals += 1;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // An open suggestion list inside the dialog gets to close first.
        if ((event.target as HTMLElement).getAttribute('aria-expanded') === 'true') return;
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;
      if (event.shiftKey && (current === first || current === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog?.addEventListener('keydown', onKeyDown);

    return () => {
      dialog?.removeEventListener('keydown', onKeyDown);
      openModals -= 1;
      if (openModals === 0) document.body.style.overflow = '';
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className={cx('modal-backdrop', variant === 'drawer' && 'modal-backdrop--drawer')}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={cx('modal', variant === 'drawer' && 'modal--drawer', wide && 'modal--wide')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-modal
      >
        <div className="modal__head">
          <h2 className={cx('modal__title', hideTitle && 'sr-only')} id={titleId}>
            {title}
          </h2>
          <button type="button" className="btn btn--ghost btn--icon btn--sm" onClick={onClose} aria-label="Close" style={{ marginLeft: 'auto' }}>
            <X aria-hidden />
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
