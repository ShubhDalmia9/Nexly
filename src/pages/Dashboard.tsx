import { ArrowRight, BellOff, Check, Compass, Inbox, UserPlus, Users } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { NotificationItem } from '../../shared/types';
import { api } from '../api';
import { errorMessage } from '../api/client';
import { ConnectionActions } from '../components/profile/ConnectionActions';
import { RelevanceBadge } from '../components/profile/Relevance';
import { PersonCard, PersonCardSkeleton, PersonRow } from '../components/profile/PersonCard';
import { buttonClass } from '../components/ui/Button';
import { EmptyState, ErrorState, ProgressRing, Skeleton } from '../components/ui/Feedback';
import { useCurrentUser } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import { useAsync } from '../hooks/useAsync';
import { cx, firstName, greeting, plural, timeAgo } from '../utils/format';
import { usePageTitle } from '../hooks/usePageTitle';

function notificationText(item: NotificationItem): string {
  if (item.type === 'welcome') return 'Welcome to Nexly';
  const name = item.actor?.fullName ?? 'Someone';
  return item.type === 'connection_request' ? `New connection request from ${name}` : `Connection request accepted by ${name}`;
}

function DashboardSkeleton() {
  return (
    <div className="dashboard" aria-hidden>
      <div className="dashboard__main">
        <div className="stat-strip">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} height={86} radius={18} />
          ))}
        </div>
        <Skeleton width={220} height={22} />
        <div className="people-grid">
          <PersonCardSkeleton />
          <PersonCardSkeleton />
        </div>
      </div>
      <div className="dashboard__side">
        <Skeleton height={190} radius={18} />
        <Skeleton height={220} radius={18} />
      </div>
    </div>
  );
}

export function Dashboard() {
  usePageTitle('Home');
  const user = useCurrentUser();
  const { version } = useNotifications();
  const { data, loading, error, reload } = useAsync(() => api.dashboard(), []);

  // New notifications or requests change what the dashboard shows; refetch quietly when they arrive.
  const seenVersion = useRef(version);
  useEffect(() => {
    if (seenVersion.current === version) return;
    seenVersion.current = version;
    void reload();
  }, [version, reload]);

  const name = firstName(user.profile.fullName);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>
            {greeting()}, {name}
          </h1>
          <p>
            {data
              ? data.incomingCount > 0
                ? `${plural(data.incomingCount, 'person is', 'people are')} waiting to connect, and ${data.stats.remaining} more are ranked for you.`
                : data.stats.remaining > 0
                  ? `${plural(data.stats.remaining, 'person is', 'people are')} ranked and waiting in your deck.`
                  : 'You are all caught up. New members will appear in Discover.'
              : 'Here is what is new in your network.'}
          </p>
        </div>
        <Link to="/discover" className={buttonClass({ variant: 'primary' })}>
          <Compass aria-hidden />
          Start discovering
        </Link>
      </header>

      {loading && !data && <DashboardSkeleton />}
      {error && !data && <ErrorState title="Your dashboard did not load" message={errorMessage(error)} onRetry={reload} />}

      {data && (
        <div className="dashboard">
          <div className="dashboard__main">
            <dl className="stat-strip">
              <div className="stat">
                <dt>To discover</dt>
                <dd>{data.stats.remaining}</dd>
              </div>
              <div className="stat">
                <dt>Connections</dt>
                <dd>{data.stats.connections}</dd>
              </div>
              <div className="stat">
                <dt>Requests sent</dt>
                <dd>{data.stats.requestsSent}</dd>
              </div>
              <div className="stat">
                <dt>Reviewed today</dt>
                <dd>{data.stats.reviewedToday}</dd>
              </div>
            </dl>

            <section aria-labelledby="recommended-title">
              <div className="section-head">
                <h2 id="recommended-title">Recommended for you</h2>
                <Link to="/discover" className="text-link">
                  See all in Discover <ArrowRight size={15} aria-hidden style={{ display: 'inline', verticalAlign: '-2px' }} />
                </Link>
              </div>
              {data.recommended.length === 0 ? (
                <div className="card">
                  <EmptyState icon={Compass} title="No new recommendations" text="You have seen everyone for now. New members will be ranked for you as they join." />
                </div>
              ) : (
                <div className="people-grid">
                  {data.recommended.map((person) => (
                    <PersonCard key={person.profile.userId} person={person} onChange={() => void reload()} />
                  ))}
                </div>
              )}
            </section>

            <section aria-labelledby="requests-title">
              <div className="section-head">
                <h2 id="requests-title">
                  Pending requests
                  {data.incomingCount > 0 && <span className="count-dot">{data.incomingCount}</span>}
                </h2>
                {data.incomingCount > 0 && (
                  <Link to="/connections?tab=requests" className="text-link">
                    View all
                  </Link>
                )}
              </div>
              <div className="card">
                {data.incoming.length === 0 ? (
                  <EmptyState icon={Inbox} title="No requests waiting" text="When someone sends you a connection request, it appears here and in your notifications." />
                ) : (
                  <ul className="request-list">
                    {data.incoming.map((person) => (
                      <li key={person.profile.userId} className="request">
                        <PersonRow
                          person={person}
                          trailing={<RelevanceBadge relevance={person.relevance} compact />}
                        />
                        <div className="request__foot">
                          <span className="muted">
                            {person.relevance.reasons.find((reason) => reason.kind !== 'incoming')?.label ?? 'Wants to connect'}
                            {person.connection.since ? ` · ${timeAgo(person.connection.since)}` : ''}
                          </span>
                          <ConnectionActions person={person} onChange={() => void reload()} size="sm" />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>

          <aside className="dashboard__side">
            <section className="card card--pad" aria-labelledby="strength-title">
              <div className="strength">
                <ProgressRing value={data.completion.percent} size={76} label={`Profile ${data.completion.percent}% complete`} />
                <div>
                  <h2 id="strength-title" className="card__title">
                    Profile strength
                  </h2>
                  <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                    {data.completion.percent === 100 ? 'Complete. You are giving the ranking everything it needs.' : 'A fuller profile gives you better recommendations.'}
                  </p>
                </div>
              </div>
              {data.completion.percent < 100 && (
                <ul className="checklist checklist--compact">
                  {data.completion.items
                    .filter((item) => !item.done)
                    .slice(0, 3)
                    .map((item) => (
                      <li key={item.key}>
                        <span className="checklist__mark" aria-hidden />
                        <span>
                          {item.label}
                          <small>{item.hint}</small>
                        </span>
                      </li>
                    ))}
                </ul>
              )}
              <Link to="/profile/edit" className={buttonClass({ variant: 'secondary', size: 'sm', block: true })} style={{ marginTop: 16 }}>
                {data.completion.percent === 100 ? 'Edit profile' : 'Complete your profile'}
              </Link>
            </section>

            {data.actions.length > 0 && (
              <section className="card card--pad" aria-labelledby="actions-title">
                <h2 id="actions-title" className="card__title" style={{ marginBottom: 12 }}>
                  Suggested next steps
                </h2>
                <ul className="action-list">
                  {data.actions.map((action) => (
                    <li key={action.id}>
                      <Link to={action.href}>
                        <span>
                          <strong>{action.title}</strong>
                          <small>{action.description}</small>
                        </span>
                        <ArrowRight aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="card card--pad" aria-labelledby="recent-title">
              <div className="card__head">
                <h2 id="recent-title" className="card__title">
                  Recent connections
                </h2>
                {data.recentConnections.length > 0 && (
                  <Link to="/connections?tab=connections" className="text-link" style={{ fontSize: 'var(--text-sm)' }}>
                    View all
                  </Link>
                )}
              </div>
              {data.recentConnections.length === 0 ? (
                <p className="side-empty">
                  <Users aria-hidden />
                  No connections yet. Press Connect on someone in Discover to send your first request.
                </p>
              ) : (
                <ul className="row-list">
                  {data.recentConnections.map((person) => (
                    <li key={person.profile.userId}>
                      <PersonRow
                        person={person}
                        trailing={<span className="row-list__meta">{person.connection.since ? timeAgo(person.connection.since) : ''}</span>}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card card--pad" aria-labelledby="activity-title">
              <div className="card__head">
                <h2 id="activity-title" className="card__title">
                  Notifications
                  {data.unreadNotifications > 0 && <span className="count-dot" style={{ marginLeft: 8 }}>{data.unreadNotifications}</span>}
                </h2>
                <Link to="/notifications" className="text-link" style={{ fontSize: 'var(--text-sm)' }}>
                  View all
                </Link>
              </div>
              {data.notifications.length === 0 ? (
                <p className="side-empty">
                  <BellOff aria-hidden />
                  Nothing yet. Requests and replies will show up here.
                </p>
              ) : (
                <ul className="activity">
                  {data.notifications.map((item) => (
                    <li key={item.id} className={cx(!item.read && 'is-unread')}>
                      <span className="activity__icon" aria-hidden>
                        {item.type === 'connection_accepted' ? <Check /> : <UserPlus />}
                      </span>
                      <span>
                        {notificationText(item)}
                        <small>{timeAgo(item.createdAt)}</small>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>
      )}
    </>
  );
}
