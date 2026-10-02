import { Compass, Keyboard, RotateCcw, SlidersHorizontal, Sparkles, Undo2, Users } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { DiscoveryStats, Person } from '../../shared/types';
import { api } from '../api';
import { ApiError, errorMessage } from '../api/client';
import { ConnectedDialog } from '../components/discovery/ConnectedDialog';
import { DeckActions } from '../components/discovery/DeckActions';
import { DeckCard } from '../components/discovery/DeckCard';
import { DiscoveryFilters, EMPTY_FILTERS, activeFilterCount } from '../components/discovery/DiscoveryFilters';
import { ProfileDetail } from '../components/profile/ProfileDetail';
import { tierLabel } from '../components/profile/Relevance';
import { Avatar } from '../components/ui/Avatar';
import { Button, buttonClass } from '../components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/Feedback';
import { Modal } from '../components/ui/Modal';
import { useCurrentUser } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import { useToast } from '../context/ToastContext';
import { useAsync } from '../hooks/useAsync';
import { useDebounced } from '../hooks/useDebounced';
import { useMeta } from '../hooks/useMeta';
import { usePageTitle } from '../hooks/usePageTitle';
import { cx, firstName, plural, roleLine } from '../utils/format';

function CardSkeleton() {
  return (
    <div className="deck" aria-hidden>
      <div className="deck-card">
        <div className="deck-card__cover" />
        <div className="deck-card__head">
          <Skeleton width={80} height={80} radius={26} className="deck-card__avatar" />
          <div className="deck-card__identity stack" style={{ gap: 8 }}>
            <Skeleton width={170} height={20} />
            <Skeleton width={220} height={12} />
          </div>
        </div>
        <div className="deck-card__body">
          <Skeleton height={104} radius={14} />
          <Skeleton width={60} height={10} />
          <div className="row" style={{ gap: 6 }}>
            <Skeleton width={70} height={28} radius={999} />
            <Skeleton width={96} height={28} radius={999} />
            <Skeleton width={58} height={28} radius={999} />
          </div>
          <Skeleton width="80%" height={14} />
          <Skeleton width="95%" height={12} />
        </div>
      </div>
    </div>
  );
}

/**
 * Discovery: one profile card at a time, most relevant first, with four buttons.
 * Connect and Skip record a decision and remove the card; Previous and Next move through the
 * profiles that are still undecided.
 */
export function Discover() {
  usePageTitle('Discover');
  const me = useCurrentUser();
  const meta = useMeta();
  const notifications = useNotifications();
  const { toast, error: toastError } = useToast();

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const appliedFilters = useDebounced(filters, 250);
  const { data, loading, error, reload } = useAsync(() => api.discovery.list(appliedFilters), [appliedFilters]);

  const [people, setPeople] = useState<Person[]>([]);
  const [index, setIndex] = useState(0);
  /** Which way the last move went, so the incoming card animates from the right side. */
  const [motion, setMotion] = useState<'forward' | 'back'>('forward');
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<DiscoveryStats | null>(null);
  const [undoable, setUndoable] = useState(0);
  const [undoing, setUndoing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [opened, setOpened] = useState<Person | null>(null);
  const [connected, setConnected] = useState<Person | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  // Decisions and undos are sent one at a time, in order, so "undo the last action" always means the same thing on the server.
  const queue = useRef<Promise<void>>(Promise.resolve());
  const indexRef = useRef(0);
  indexRef.current = index;

  useEffect(() => {
    if (!data) return;
    setPeople(data.people);
    setIndex(0);
    setTotal(data.total);
    setStats(data.stats);
  }, [data]);

  const current = people[index] ?? null;
  const filterCount = activeFilterCount(filters);

  // The server sends the list in pages; fetch the next page once this one is used up.
  const needsMore = !loading && people.length === 0 && total > 0;
  useEffect(() => {
    if (needsMore) queue.current = queue.current.then(() => reload());
  }, [needsMore, reload]);

  const goPrevious = useCallback(() => {
    setMotion('back');
    setIndex((value) => Math.max(0, value - 1));
  }, []);

  const goNext = useCallback(() => {
    setMotion('forward');
    setIndex((value) => Math.min(people.length - 1, value + 1));
  }, [people.length]);

  const undo = useCallback(() => {
    setUndoing(true);
    queue.current = queue.current.then(async () => {
      try {
        const result = await api.discovery.undo();
        const id = result.person.profile.userId;
        // Put the profile back where the member is looking.
        setPeople((list) => {
          const without = list.filter((person) => person.profile.userId !== id);
          const at = Math.min(indexRef.current, without.length);
          return [...without.slice(0, at), result.person, ...without.slice(at)];
        });
        setMotion('back');
        setTotal((value) => value + 1);
        setStats(result.stats);
        setUndoable((value) => Math.max(0, value - 1));
        const name = firstName(result.person.profile.fullName);
        const message =
          result.action === 'connect' ? `Connection request to ${name} withdrawn. ${name} is back in your list.` : `${name} is back in your list.`;
        toast(message);
        setAnnouncement(message);
        void notifications.refresh();
      } catch (caught) {
        toastError(errorMessage(caught));
        // Nothing left to undo, or the last action can no longer be reversed.
        if (caught instanceof ApiError && (caught.status === 404 || caught.status === 409)) setUndoable(0);
      } finally {
        setUndoing(false);
      }
    });
  }, [notifications, toast, toastError]);

  const decide = useCallback(
    (person: Person, action: 'connect' | 'skip') => {
      const id = person.profile.userId;
      const name = firstName(person.profile.fullName);
      const position = indexRef.current;
      // The card leaves straight away; if saving fails it is put back.
      setPeople((list) => list.filter((item) => item.profile.userId !== id));
      setIndex((value) => Math.max(0, Math.min(value, people.length - 2)));
      setMotion('forward');
      setTotal((value) => Math.max(0, value - 1));
      setUndoable((value) => value + 1);
      setAnnouncement(action === 'connect' ? `Connection request sent to ${person.profile.fullName}.` : `Skipped ${person.profile.fullName}.`);

      queue.current = queue.current.then(async () => {
        try {
          const result = await api.discovery.decide(id, action);
          setStats(result.stats);
          if (result.outcome === 'connected') {
            setConnected(result.person);
            // An accepted connection cannot be taken back with Undo.
            setUndoable(0);
          } else if (result.outcome === 'requested') {
            toast(`Connection request sent to ${name}.`, { action: { label: 'Undo', onClick: undo } });
          }
          if (action === 'connect') void notifications.refresh();
        } catch (caught) {
          // Not saved: put the card back rather than pretend it worked.
          toastError(`That was not saved for ${name}. ${errorMessage(caught)}`);
          setPeople((list) => {
            const without = list.filter((item) => item.profile.userId !== id);
            const at = Math.min(position, without.length);
            return [...without.slice(0, at), person, ...without.slice(at)];
          });
          setTotal((value) => value + 1);
          setUndoable((value) => Math.max(0, value - 1));
        }
      });
    },
    [notifications, people.length, toast, toastError, undo],
  );

  const restoreSkipped = async () => {
    setRestoring(true);
    try {
      await queue.current;
      const { restored } = await api.discovery.restoreSkipped();
      setUndoable(0);
      await reload();
      toast(`${plural(restored, 'skipped profile')} back in your list.`);
    } catch (caught) {
      toastError(errorMessage(caught));
    } finally {
      setRestoring(false);
    }
  };

  // Keyboard: arrows move between profiles, C connects, S skips, U undoes, I opens the full profile.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target instanceof Element && target.closest('input, textarea, select, [role="dialog"], [role="menu"], [contenteditable="true"]')) return;
      if (document.querySelector('[data-modal]')) return;
      const key = event.key.toLowerCase();
      if (key === 'arrowleft') goPrevious();
      else if (key === 'arrowright') goNext();
      else if (key === 'c' && current) decide(current, 'connect');
      else if (key === 's' && current) decide(current, 'skip');
      else if (key === 'u' && undoable > 0 && !undoing) undo();
      else if (key === 'i' && current) setOpened(current);
      else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [current, decide, goNext, goPrevious, undo, undoable, undoing]);

  const decideFromDrawer = (action: 'connect' | 'skip') => {
    if (opened) decide(opened, action);
    setOpened(null);
  };

  const clearFilters = () => setFilters({ ...EMPTY_FILTERS, sort: filters.sort });
  const showSkeleton = loading && people.length === 0;
  const showError = Boolean(error) && people.length === 0 && !loading;
  const showEmpty = !loading && !error && people.length === 0 && total === 0;

  return (
    <div className="discover">
      <aside className="discover__filters card" aria-label="Filters">
        <div className="card__head">
          <h2 className="card__title">Filters</h2>
          {filterCount > 0 && (
            <button type="button" className="text-link" style={{ fontSize: 'var(--text-sm)' }} onClick={clearFilters}>
              Clear {filterCount}
            </button>
          )}
        </div>
        <DiscoveryFilters filters={filters} onChange={setFilters} meta={meta} />
      </aside>

      <section className="discover__main" aria-label="Discovery">
        <header className="discover__bar">
          <div>
            <h1>Discover</h1>
            <p className="muted" aria-live="polite">
              {showSkeleton
                ? 'Ranking people for you…'
                : current
                  ? `Profile ${index + 1} of ${plural(total, 'person', 'people')}${filterCount > 0 ? ' in your filters' : ', most relevant first'}`
                  : filterCount > 0
                    ? 'No profiles fit your filters'
                    : 'You are all caught up'}
            </p>
          </div>
          <Button className="discover__filter-button" onClick={() => setFiltersOpen(true)} aria-haspopup="dialog">
            <SlidersHorizontal aria-hidden />
            Filters
            {filterCount > 0 && (
              <span className="count-dot" style={{ background: 'var(--iris-600)' }}>
                {filterCount}
              </span>
            )}
          </Button>
        </header>

        <div className="discover__stage">
          {showSkeleton && <CardSkeleton />}
          {showError && <ErrorState title="We could not load your recommendations" message={errorMessage(error)} onRetry={reload} />}
          {showEmpty &&
            (filterCount > 0 ? (
              <EmptyState
                icon={SlidersHorizontal}
                title="No more profiles fit these filters"
                text="Try removing a filter or two. Skills, interests and goals each require every selected tag."
              >
                <Button variant="primary" onClick={clearFilters}>
                  Clear filters
                </Button>
              </EmptyState>
            ) : (
              <EmptyState
                icon={Sparkles}
                title="You have reviewed everyone"
                text={
                  stats && stats.skipped > 0
                    ? `That is every profile for now. You skipped ${plural(stats.skipped, 'person', 'people')} along the way and can take a second look.`
                    : 'That is every profile for now. New members will appear here as they join.'
                }
              >
                {stats && stats.skipped > 0 && (
                  <Button variant="primary" loading={restoring} onClick={restoreSkipped}>
                    <RotateCcw aria-hidden />
                    Review skipped profiles
                  </Button>
                )}
                <Link to="/connections" className={buttonClass({ variant: 'secondary' })}>
                  <Users aria-hidden />
                  View connections
                </Link>
              </EmptyState>
            ))}
          {current && (
            <div className="deck">
              {/* The key restarts the entrance animation whenever a different profile is shown. */}
              <div
                key={current.profile.userId}
                className={cx('deck__card', `is-entering-${motion}`)}
                role="group"
                aria-roledescription="profile card"
                aria-label={`${current.profile.fullName}, ${roleLine(current.profile.profession, current.profile.workplace)}. ${tierLabel(current.relevance.tier)}, relevance score ${current.relevance.score}.`}
              >
                <DeckCard person={current} onOpen={() => setOpened(current)} />
              </div>
            </div>
          )}
        </div>

        <DeckActions
          name={current?.profile.fullName ?? null}
          canGoBack={index > 0}
          canGoForward={index < people.length - 1}
          busy={false}
          accepts={current?.connection.status === 'pending_received'}
          onPrevious={goPrevious}
          onNext={goNext}
          onSkip={() => current && decide(current, 'skip')}
          onConnect={() => current && decide(current, 'connect')}
        />
        <div className="discover__undo">
          <button type="button" className="btn btn--ghost btn--sm" onClick={undo} disabled={undoable === 0 || undoing} title="Undo (U)">
            <Undo2 aria-hidden />
            Undo last action
          </button>
        </div>
        <p className="discover__hint">
          <Keyboard aria-hidden />
          <span>
            <kbd>←</kbd> previous <kbd>→</kbd> next <kbd>C</kbd> connect <kbd>S</kbd> skip <kbd>U</kbd> undo <kbd>I</kbd> details
          </span>
        </p>
        <p className="sr-only" role="status" aria-live="polite">
          {announcement}
        </p>
      </section>

      <aside className="discover__side" aria-label="Your discovery activity">
        <div className="card card--pad">
          <h2 className="card__title" style={{ marginBottom: 14 }}>
            Your activity
          </h2>
          <dl className="stat-list">
            <div>
              <dt>Still to review</dt>
              <dd>{stats ? stats.remaining : '–'}</dd>
            </div>
            <div>
              <dt>Reviewed in the last 24 hours</dt>
              <dd>{stats ? stats.reviewedToday : '–'}</dd>
            </div>
            <div>
              <dt>Requests awaiting a reply</dt>
              <dd>{stats ? stats.requestsSent : '–'}</dd>
            </div>
            <div>
              <dt>Connections</dt>
              <dd>{stats ? stats.connections : '–'}</dd>
            </div>
          </dl>
        </div>

        {people.length - index > 1 && (
          <div className="card card--pad">
            <h2 className="card__title" style={{ marginBottom: 12 }}>
              Coming up
            </h2>
            <ul className="upnext">
              {people.slice(index + 1, index + 4).map((person) => (
                <li key={person.profile.userId}>
                  <Avatar name={person.profile.fullName} photoUrl={person.profile.photoUrl} size={36} />
                  <div>
                    <strong>{person.profile.fullName}</strong>
                    <span>{person.profile.profession}</span>
                  </div>
                  <span className="upnext__score" title="Relevance score">
                    {person.relevance.score}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="card card--pad discover__tip">
          <Compass aria-hidden />
          <p>
            Profiles are ranked by shared skills and interests, related fields, work history, relevant projects, career goals and who each of
            you wants to meet.{' '}
            <Link to="/profile/edit" className="text-link">
              Improve your profile
            </Link>{' '}
            to sharpen the ranking.
          </p>
        </div>
      </aside>

      <Modal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        footer={
          <>
            <Button variant="ghost" onClick={clearFilters} disabled={filterCount === 0}>
              Clear all
            </Button>
            <Button variant="primary" onClick={() => setFiltersOpen(false)}>
              {loading ? 'Updating…' : `Show ${plural(total, 'person', 'people')}`}
            </Button>
          </>
        }
      >
        <DiscoveryFilters filters={filters} onChange={setFilters} meta={meta} />
      </Modal>

      <Modal
        open={opened !== null}
        onClose={() => setOpened(null)}
        title={opened ? `${opened.profile.fullName}, ${roleLine(opened.profile.profession, opened.profile.workplace)}` : 'Profile'}
        hideTitle
        variant="drawer"
        footer={
          <>
            <Button variant="secondary" onClick={() => decideFromDrawer('skip')}>
              Skip
            </Button>
            <Button variant="primary" onClick={() => decideFromDrawer('connect')}>
              {opened?.connection.status === 'pending_received' ? 'Accept request' : 'Connect'}
            </Button>
          </>
        }
      >
        {opened && <ProfileDetail person={opened} onChange={setOpened} hideActions />}
      </Modal>

      <ConnectedDialog person={connected} me={me.profile} onClose={() => setConnected(null)} />
    </div>
  );
}
