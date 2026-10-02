import { CircleAlert, CircleCheck, X } from 'lucide-react';
import { type ReactNode, createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { cx } from '../utils/format';

interface ToastOptions {
  tone?: 'success' | 'error';
  action?: { label: string; onClick: () => void };
  durationMs?: number;
}

interface Toast extends ToastOptions {
  id: number;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, options?: ToastOptions) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, options: ToastOptions = {}) => {
      const id = nextId.current++;
      // Keep at most three on screen so a run of quick decisions does not stack up.
      setToasts((current) => [...current.slice(-2), { id, message, ...options }]);
      window.setTimeout(() => dismiss(id), options.durationMs ?? (options.tone === 'error' ? 6000 : 4000));
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({ toast, error: (message) => toast(message, { tone: 'error' }) }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" role="region" aria-label="Notifications">
        {toasts.map((item) => (
          <div
            key={item.id}
            className={cx('toast', item.tone === 'error' && 'toast--error')}
            role={item.tone === 'error' ? 'alert' : 'status'}
          >
            {item.tone === 'error' ? <CircleAlert className="toast__icon" aria-hidden /> : <CircleCheck className="toast__icon" aria-hidden />}
            <span className="toast__message">{item.message}</span>
            {item.action && (
              <button
                type="button"
                className="toast__action"
                onClick={() => {
                  item.action?.onClick();
                  dismiss(item.id);
                }}
              >
                {item.action.label}
              </button>
            )}
            <button type="button" className="toast__close" aria-label="Dismiss" onClick={() => dismiss(item.id)}>
              <X size={15} aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>.');
  return context;
}
