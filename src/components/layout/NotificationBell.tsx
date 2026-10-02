import { Bell, BellOff } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { NotificationItem } from '../../../shared/types';
import { api } from '../../api';
import { useNotifications } from '../../context/NotificationsContext';
import { useDismiss } from '../../hooks/useDismiss';
import { NotificationRow } from '../notifications/NotificationRow';
import { EmptyState, ErrorState, Skeleton } from '../ui/Feedback';

const MOBILE_QUERY = '(max-width: 860px)';

/** The bell in the top bar: an unread badge and a dropdown of the latest notifications. */
export function NotificationBell() {
  const { unread, version, refresh } = useNotifications();
  const navigate = useNavigate();
  const anchorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  const close = useCallback(() => setOpen(false), []);
  useDismiss(anchorRef, open, close);

  const load = useCallback(async () => {
    try {
      const response = await api.notifications.list();
      setItems(response.items.slice(0, 6));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  // Refetch whenever the popover is open and the unread count changes underneath it.
  useEffect(() => {
    if (open) void load();
  }, [open, version, load]);

  const onChanged = () => {
    void load();
    void refresh();
  };

  const markAllRead = async () => {
    try {
      const response = await api.notifications.markAllRead();
      setItems(response.items.slice(0, 6));
      void refresh();
    } catch {
      setFailed(true);
    }
  };

  const toggle = () => {
    // On phones the full page is easier to use than a dropdown.
    if (window.matchMedia(MOBILE_QUERY).matches) navigate('/notifications');
    else setOpen((current) => !current);
  };

  return (
    <div className="popover-anchor" ref={anchorRef}>
      <button
        type="button"
        className="icon-button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
      >
        <Bell aria-hidden />
        {unread > 0 && (
          <span className="count-dot" aria-hidden>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="menu notification-popover" role="dialog" aria-label="Notifications">
          <div className="notification-popover__head">
            <h2>Notifications</h2>
            <button type="button" className="text-link" onClick={markAllRead} disabled={unread === 0} style={{ fontSize: 'var(--text-sm)', opacity: unread === 0 ? 0.45 : 1 }}>
              Mark all as read
            </button>
          </div>
          <div className="notification-popover__list">
            {failed ? (
              <ErrorState message="Your notifications could not be loaded." onRetry={load} />
            ) : items === null ? (
              <div className="stack" style={{ gap: 14, padding: 16 }} aria-label="Loading notifications">
                {[0, 1, 2].map((row) => (
                  <div key={row} className="row" style={{ gap: 12 }}>
                    <Skeleton width={44} height={44} radius={14} />
                    <div className="stack" style={{ gap: 8, flex: 1 }}>
                      <Skeleton width="80%" />
                      <Skeleton width="40%" height={10} />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <EmptyState icon={BellOff} title="Nothing yet" text="Connection requests and replies will show up here." />
            ) : (
              <ul>
                {items.map((item) => (
                  <NotificationRow key={item.id} item={item} onChanged={onChanged} onNavigate={close} />
                ))}
              </ul>
            )}
          </div>
          <div className="notification-popover__foot">
            <Link to="/notifications" className="text-link" onClick={close}>
              See all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
