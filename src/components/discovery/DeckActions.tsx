import { ChevronLeft, ChevronRight, UserPlus, X } from 'lucide-react';
import { firstName } from '../../utils/format';

interface DeckActionsProps {
  /** The name on the card being shown, or null when there is no card. */
  name: string | null;
  canGoBack: boolean;
  canGoForward: boolean;
  /** True while Connect or Skip is being saved for this card. */
  busy: boolean;
  /** The other person has already sent a request, so Connect accepts it. */
  accepts?: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSkip: () => void;
  onConnect: () => void;
}

/**
 * The four actions on a profile card.
 *   Connect   send a connection request (the card leaves your list)
 *   Skip      set the profile aside (the card leaves your list)
 *   Previous  look at the profile before this one
 *   Next      look at the next profile and decide on this one later
 */
export function DeckActions({ name, canGoBack, canGoForward, busy, accepts, onPrevious, onNext, onSkip, onConnect }: DeckActionsProps) {
  const first = name ? firstName(name) : null;
  const empty = name === null;
  return (
    <div className="deck-actions" role="group" aria-label="Profile actions">
      <button type="button" className="deck-nav" onClick={onPrevious} disabled={!canGoBack} title="Previous profile (←)">
        <ChevronLeft aria-hidden />
        <span>Previous</span>
      </button>
      <button type="button" className="btn btn--secondary btn--lg deck-actions__skip" onClick={onSkip} disabled={empty || busy} title="Skip (S)">
        <X aria-hidden />
        Skip
        {first && <span className="sr-only"> {first}</span>}
      </button>
      <button type="button" className="btn btn--primary btn--lg deck-actions__connect" onClick={onConnect} disabled={empty || busy} title="Connect (C)">
        <UserPlus aria-hidden />
        {accepts ? 'Accept' : 'Connect'}
        {first && <span className="sr-only"> {accepts ? `${first}’s connection request` : `with ${first}`}</span>}
      </button>
      <button type="button" className="deck-nav" onClick={onNext} disabled={!canGoForward} title="Next profile (→)">
        <span>Next</span>
        <ChevronRight aria-hidden />
      </button>
    </div>
  );
}
