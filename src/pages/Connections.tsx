import { Compass, Inbox, Send, Users } from 'lucide-react';
import { type ReactNode, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Person } from '../../shared/types';
import { api } from '../api';
import { errorMessage } from '../api/client';
import { PersonCard, PersonCardSkeleton } from '../components/profile/PersonCard';
import { buttonClass } from '../components/ui/Button';
import { EmptyState, ErrorState } from '../components/ui/Feedback';
import { type TabItem, Tabs } from '../components/ui/Tabs';
import { useNotifications } from '../context/NotificationsContext';
import { useAsync } from '../hooks/useAsync';
import { timeAgo } from '../utils/format';
import { usePageTitle } from '../hooks/usePageTitle';

type TabId = 'requests' | 'connections' | 'sent';
const TAB_IDS: TabId[] = ['requests', 'connections', 'sent'];

const discoverLink = (
  <Link to="/discover" className={buttonClass({ variant: 'primary' })}>
    <Compass aria-hidden />
    Open Discover
  </Link>
);

export function Connections() {
  usePageTitle('Connections');
  const { version } = useNotifications();
  const [params, setParams] = useSearchParams();
  const { data, loading, error, reload } = useAsync(() => api.connections.list(), []);

  // A request arriving or being answered elsewhere changes these lists.
  const seenVersion = useRef(version);
  useEffect(() => {
    if (seenVersion.current === version) return;
    seenVersion.current = version;
    void reload();
  }, [version, reload]);

  const requested = params.get('tab') as TabId | null;
  // The opening tab is chosen once, from the first load. Answering the last request must not
  // then switch the page to another tab under the member's hands.
  const openingTab = useRef<TabId | null>(null);
  if (data && openingTab.current === null) openingTab.current = data.incoming.length === 0 ? 'connections' : 'requests';
  const fallback: TabId = openingTab.current ?? 'requests';
  const tab: TabId = requested && TAB_IDS.includes(requested) ? requested : fallback;

  const tabs: TabItem<TabId>[] = [
    { id: 'requests', label: 'Requests', count: data?.incoming.length, alert: true },
    { id: 'connections', label: 'Connections', count: data?.accepted.length },
    { id: 'sent', label: 'Sent', count: data?.sent.length },
  ];

  const since = (person: Person) => (person.connection.since ? timeAgo(person.connection.since) : '');
  const onChange = () => void reload();

  const lists: Record<TabId, { people: Person[]; note: (person: Person) => string; empty: ReactNode }> = {
    requests: {
      people: data?.incoming ?? [],
      note: (person) => `Asked ${since(person).toLowerCase()}`,
      empty: (
        <EmptyState icon={Inbox} title="No pending requests" text="When someone sends you a connection request, it appears here for you to accept or decline.">
          {discoverLink}
        </EmptyState>
      ),
    },
    connections: {
      people: data?.accepted ?? [],
      note: (person) => `Connected ${since(person).toLowerCase()}`,
      empty: (
        <EmptyState icon={Users} title="No connections yet" text="Press Connect on people in Discover. Once they accept, they will be listed here with their contact details.">
          {discoverLink}
        </EmptyState>
      ),
    },
    sent: {
      people: data?.sent ?? [],
      note: (person) => `Sent ${since(person).toLowerCase()}`,
      empty: (
        <EmptyState icon={Send} title="No requests waiting" text="Requests you send stay here until the other person replies. You can withdraw one at any time.">
          {discoverLink}
        </EmptyState>
      ),
    },
  };
  const current = lists[tab];

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Connections</h1>
          <p>Answer requests, keep track of the ones you have sent, and reach the people you are connected with.</p>
        </div>
      </header>

      <div className="tabs-wrap">
        <Tabs label="Connection lists" tabs={tabs} value={tab} onChange={(id) => setParams({ tab: id }, { replace: true })} idPrefix="connections" />
      </div>

      <div role="tabpanel" id={`connections-panel-${tab}`} aria-labelledby={`connections-tab-${tab}`} tabIndex={0} className="tab-panel">
        {loading && !data && (
          <div className="people-grid" aria-hidden>
            <PersonCardSkeleton />
            <PersonCardSkeleton />
            <PersonCardSkeleton />
          </div>
        )}
        {error && !data && <ErrorState title="Your connections did not load" message={errorMessage(error)} onRetry={reload} />}
        {data &&
          (current.people.length === 0 ? (
            <div className="card">{current.empty}</div>
          ) : (
            <div className="people-grid">
              {current.people.map((person) => (
                <PersonCard key={person.profile.userId} person={person} onChange={onChange} note={current.note(person)} />
              ))}
            </div>
          ))}
      </div>
    </>
  );
}
