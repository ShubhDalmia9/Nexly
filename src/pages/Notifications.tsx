import { BellOff, CheckCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { errorMessage } from '../api/client';
import { NotificationRow } from '../components/notifications/NotificationRow';
import { Button } from '../components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/Feedback';
import { useNotifications } from '../context/NotificationsContext';
import { useToast } from '../context/ToastContext';
import { useAsync } from '../hooks/useAsync';
import { plural } from '../utils/format';
import { usePageTitle } from '../hooks/usePageTitle';

export function Notifications() {
  usePageTitle('Notifications');
  const { version, refresh } = useNotifications();
  const { error: toastError } = useToast();
  const { data, loading, error, reload, setData } = useAsync(() => api.notifications.list(), []);
  const [marking, setMarking] = useState(false);

  const seenVersion = useRef(version);
  useEffect(() => {
    if (seenVersion.current === version) return;
    seenVersion.current = version;
    void reload();
  }, [version, reload]);

  const onChanged = () => {
    void reload();
    void refresh();
  };

  const markAllRead = async () => {
    setMarking(true);
    try {
      setData(await api.notifications.markAllRead());
      void refresh();
    } catch (caught) {
      toastError(errorMessage(caught));
    } finally {
      setMarking(false);
    }
  };

  const unread = data?.unread ?? 0;

  return (
    <div className="page-narrow">
      <header className="page-head">
        <div>
          <h1>Notifications</h1>
          <p aria-live="polite">{data ? (unread > 0 ? `${plural(unread, 'unread notification')}` : 'You are all caught up.') : 'Loading your notifications…'}</p>
        </div>
        <Button onClick={markAllRead} loading={marking} disabled={unread === 0}>
          <CheckCheck aria-hidden />
          Mark all as read
        </Button>
      </header>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading && !data && (
          <div className="stack" style={{ gap: 20, padding: 20 }} aria-hidden>
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="row" style={{ gap: 12 }}>
                <Skeleton width={44} height={44} radius={14} />
                <div className="stack" style={{ gap: 8, flex: 1 }}>
                  <Skeleton width="55%" />
                  <Skeleton width="30%" height={10} />
                </div>
              </div>
            ))}
          </div>
        )}
        {error && !data && <ErrorState title="Your notifications did not load" message={errorMessage(error)} onRetry={reload} />}
        {data &&
          (data.items.length === 0 ? (
            <EmptyState icon={BellOff} title="No notifications yet" text="You will be told here when someone asks to connect or accepts your request." />
          ) : (
            <ul>
              {data.items.map((item) => (
                <NotificationRow key={item.id} item={item} onChanged={onChanged} />
              ))}
            </ul>
          ))}
      </div>
    </div>
  );
}
