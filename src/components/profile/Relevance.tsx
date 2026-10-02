import {
  Briefcase,
  Building2,
  Crosshair,
  FolderOpen,
  GraduationCap,
  Handshake,
  Landmark,
  Lightbulb,
  type LucideIcon,
  Puzzle,
  Target,
  UserPlus,
  Wrench,
} from 'lucide-react';
import type { Relevance, RelevanceReason, RelevanceReasonKind, RelevanceTier } from '../../../shared/types';
import { cx } from '../../utils/format';

const TIER_LABELS: Record<RelevanceTier, string> = {
  high: 'Highly relevant',
  good: 'Relevant',
  possible: 'Somewhat relevant',
  low: 'Outside your usual field',
};

const REASON_ICONS: Record<RelevanceReasonKind, LucideIcon> = {
  incoming: UserPlus,
  skills: Wrench,
  interests: Lightbulb,
  complementary: Puzzle,
  intent: Handshake,
  project: FolderOpen,
  field: Briefcase,
  goals: Target,
  specialisation: Crosshair,
  workplace: Building2,
  employer: Landmark,
  school: GraduationCap,
};

export function tierLabel(tier: RelevanceTier): string {
  return TIER_LABELS[tier];
}

/** The relevance score pill: a number plus a plain-language level. */
export function RelevanceBadge({ relevance, compact }: { relevance: Relevance; compact?: boolean }) {
  return (
    <span
      className={cx('relevance', `relevance--${relevance.tier}`, compact && 'relevance--compact')}
      title={`Relevance score ${relevance.score} out of 100`}
    >
      <span className="relevance__score" aria-hidden>
        {relevance.score}
      </span>
      <span>
        <span className="sr-only">Relevance score {relevance.score} out of 100. </span>
        {compact && relevance.tier === 'low' ? 'Less relevant' : TIER_LABELS[relevance.tier]}
      </span>
    </span>
  );
}

interface ReasonListProps {
  reasons: RelevanceReason[];
  /** Show at most this many reasons. */
  limit?: number;
}

/** "Why you're seeing this person": each relevance signal with the detail behind it. */
export function ReasonList({ reasons, limit }: ReasonListProps) {
  const shown = limit ? reasons.slice(0, limit) : reasons;
  if (shown.length === 0) {
    return <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>No strong overlap yet. They may still be worth a look.</p>;
  }
  return (
    <ul className="reasons">
      {shown.map((reason) => {
        const Icon = REASON_ICONS[reason.kind];
        return (
          <li key={reason.kind} className={cx('reason', reason.kind === 'incoming' && 'reason--incoming')}>
            <span className="reason__icon">
              <Icon aria-hidden />
            </span>
            <span>
              <span className="reason__label">{reason.label}</span>
              {reason.detail && <span className="reason__detail"> · {reason.detail}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Reasons as compact badges, for cards with little room. */
export function ReasonBadges({ reasons, limit = 3 }: ReasonListProps) {
  const shown = reasons.slice(0, limit);
  if (shown.length === 0) return null;
  return (
    <ul className="reasons reasons--inline">
      {shown.map((reason) => {
        const Icon = REASON_ICONS[reason.kind];
        return (
          <li key={reason.kind} className={cx('badge', reason.kind === 'incoming' ? 'badge--mint' : 'badge--iris')} title={reason.detail}>
            <Icon aria-hidden />
            {reason.label}
          </li>
        );
      })}
    </ul>
  );
}

interface TagListProps {
  tags: string[];
  /** Tags the viewer has in common; these are highlighted and listed first. */
  shared?: string[];
  limit?: number;
  label: string;
}

export function TagList({ tags, shared = [], limit, label }: TagListProps) {
  const sharedSet = new Set(shared.map((tag) => tag.toLowerCase()));
  const ordered = [...tags.filter((tag) => sharedSet.has(tag.toLowerCase())), ...tags.filter((tag) => !sharedSet.has(tag.toLowerCase()))];
  const shown = limit ? ordered.slice(0, limit) : ordered;
  const hidden = ordered.length - shown.length;
  return (
    <ul className="wrap" style={{ gap: 6 }} aria-label={label}>
      {shown.map((tag) => {
        const isShared = sharedSet.has(tag.toLowerCase());
        return (
          <li key={tag} className={cx('chip', isShared && 'chip--shared')}>
            <span>{tag}</span>
            {isShared && <span className="sr-only"> (in common)</span>}
          </li>
        );
      })}
      {hidden > 0 && (
        <li className="chip chip--more" aria-label={`and ${hidden} more`}>
          +{hidden}
        </li>
      )}
    </ul>
  );
}
