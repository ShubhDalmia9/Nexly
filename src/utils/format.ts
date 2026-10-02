export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase();
}

/** A stable hue for a name, so initials avatars keep the same colour everywhere. */
export function hueFor(text: string): number {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) hash = (hash * 31 + text.charCodeAt(index)) % 360;
  return hash;
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

export function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: days > 300 ? 'numeric' : undefined });
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

export function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** "Role · Company", skipping whichever part is missing. */
export function roleLine(profession: string, workplace: string): string {
  return [profession, workplace].filter(Boolean).join(' · ');
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 'YYYY' or 'YYYY-MM' as "2023" or "Mar 2023". */
export function formatPartialDate(value: string): string {
  const [year, month] = value.split('-');
  if (!year) return '';
  return month ? `${MONTH_NAMES[Number(month) - 1] ?? ''} ${year}`.trim() : year;
}

/** "Mar 2023 – Present" for a role. An empty end date means the role is current. */
export function formatPeriod(start: string, end: string): string {
  const from = formatPartialDate(start);
  const to = end ? formatPartialDate(end) : 'Present';
  if (!from) return end ? to : '';
  return `${from} – ${to}`;
}

export function formatYears(start: number | null, end: number | null): string {
  if (start && end) return start === end ? String(end) : `${start} – ${end}`;
  return String(end ?? start ?? '');
}
