import { Search as SearchIcon, SearchX, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SEARCH_SCOPES, type SearchScope } from '../../shared/constants';
import { api } from '../api';
import { errorMessage } from '../api/client';
import { PersonCard, PersonCardSkeleton } from '../components/profile/PersonCard';
import { EmptyState, ErrorState } from '../components/ui/Feedback';
import { useAsync } from '../hooks/useAsync';
import { useDebounced } from '../hooks/useDebounced';
import { plural } from '../utils/format';
import { usePageTitle } from '../hooks/usePageTitle';

const EXAMPLES = ['Robotics', 'Figma', 'Python', 'Helix Robotics', 'Product Manager', 'drone'];

export function Search() {
  usePageTitle('Search');
  const [params, setParams] = useSearchParams();
  const urlQuery = params.get('q') ?? '';
  const urlScope = SEARCH_SCOPES.find((option) => option.id === params.get('scope'))?.id ?? 'all';

  const [text, setText] = useState(urlQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const query = useDebounced(text.trim(), 280);

  // The query lives in two places, the field and the address bar. `written` records the last value this
  // page put in the URL, so a URL change made elsewhere (back/forward) can be told apart from our own.
  const written = useRef(urlQuery);
  const latest = useRef({ urlQuery, setParams });
  latest.current = { urlQuery, setParams };

  // Typing updates the address bar, so results can be shared and survive a refresh.
  useEffect(() => {
    if (query === latest.current.urlQuery) return;
    written.current = query;
    latest.current.setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (query) next.set('q', query);
        else next.delete('q');
        return next;
      },
      { replace: true },
    );
  }, [query]);

  // Navigating through history updates the field.
  useEffect(() => {
    if (urlQuery === written.current) return;
    written.current = urlQuery;
    setText(urlQuery);
  }, [urlQuery]);

  const setScope = (scope: SearchScope) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (scope === 'all') next.delete('scope');
        else next.set('scope', scope);
        return next;
      },
      { replace: true },
    );
  };

  const { data, loading, error, reload, setData } = useAsync(
    () => (query ? api.people.search(query, urlScope) : Promise.resolve(null)),
    [query, urlScope],
  );

  const results = data?.results ?? [];
  const waiting = Boolean(query) && (loading || text.trim() !== query);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Search</h1>
          <p>Find people by name, profession, skill, interest, workplace or project.</p>
        </div>
      </header>

      <form className="search-box" role="search" onSubmit={(event) => event.preventDefault()}>
        <SearchIcon aria-hidden />
        <input
          ref={inputRef}
          type="search"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Try “robotics”, “Figma” or a name"
          aria-label="Search people"
          maxLength={100}
          autoFocus
        />
        {text && (
          <button
            type="button"
            className="search-box__clear"
            aria-label="Clear search"
            onClick={() => {
              setText('');
              inputRef.current?.focus();
            }}
          >
            <X aria-hidden />
          </button>
        )}
      </form>

      <div className="scope-row" role="group" aria-label="Search in">
        <span className="muted">Search in</span>
        {SEARCH_SCOPES.map((scope) => (
          <button key={scope.id} type="button" className="chip chip--lg" aria-pressed={urlScope === scope.id} onClick={() => setScope(scope.id)}>
            {scope.label}
          </button>
        ))}
      </div>

      <div className="search-results" aria-live="polite" aria-busy={waiting}>
        {!query && (
          <div className="card">
            <EmptyState icon={SearchIcon} title="Search the whole network" text="Results use the same cards as the rest of Nexly, with your relevance score and what you have in common.">
              {EXAMPLES.map((example) => (
                <button key={example} type="button" className="chip chip--outline chip--lg" onClick={() => setText(example)}>
                  {example}
                </button>
              ))}
            </EmptyState>
          </div>
        )}

        {query && waiting && results.length === 0 && (
          <div className="people-grid" aria-hidden>
            <PersonCardSkeleton />
            <PersonCardSkeleton />
            <PersonCardSkeleton />
          </div>
        )}

        {query && error && !waiting && <ErrorState title="Search did not work" message={errorMessage(error)} onRetry={reload} />}

        {query && !error && !waiting && results.length === 0 && (
          <div className="card">
            <EmptyState
              icon={SearchX}
              title={`No one found for “${query}”`}
              text={urlScope === 'all' ? 'Check the spelling, or try a broader term such as a skill or a field.' : 'Nothing was found in that field. Try searching everything instead.'}
            >
              {urlScope !== 'all' && (
                <button type="button" className="btn btn--secondary" onClick={() => setScope('all')}>
                  Search everything
                </button>
              )}
            </EmptyState>
          </div>
        )}

        {query && !error && results.length > 0 && (
          <>
            <p className="search-results__count">
              {plural(results.length, 'person', 'people')} found for “{data?.query}”
            </p>
            <div className="people-grid" style={{ opacity: waiting ? 0.6 : 1, transition: 'opacity 160ms' }}>
              {results.map((result) => (
                <PersonCard
                  key={result.profile.userId}
                  person={result}
                  foundIn={result.foundIn}
                  onChange={(updated) =>
                    setData((current) =>
                      current
                        ? {
                            ...current,
                            results: current.results.map((item) =>
                              item.profile.userId === updated.profile.userId ? { ...updated, foundIn: item.foundIn } : item,
                            ),
                          }
                        : current,
                    )
                  }
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
