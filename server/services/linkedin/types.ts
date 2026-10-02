// What a LinkedIn source can tell us, before it is mapped onto Nexly's profile schema.
// Every source (PDF, data export, official sign-in, data provider) produces this one shape,
// so there is exactly one mapping layer (mapper.ts) between LinkedIn data and the database.

/** Dates are '', 'YYYY' or 'YYYY-MM'. */
export interface SourcePosition {
  title: string;
  company: string;
  location: string;
  start: string;
  end: string;
  /** True when the source says the role is ongoing. */
  current: boolean;
  description: string;
}

export interface SourceEducation {
  school: string;
  degree: string;
  field: string;
  startYear: number | null;
  endYear: number | null;
}

export interface SourceProject {
  title: string;
  description: string;
  url: string;
  start: string;
  end: string;
}

export interface SourceCertification {
  name: string;
  issuer: string;
  year: number | null;
}

export interface LinkedInSourceProfile {
  fullName: string;
  headline: string;
  summary: string;
  location: string;
  industry: string;
  /** The profile's own public URL, when the PDF includes it. */
  profileUrl: string;
  positions: SourcePosition[];
  education: SourceEducation[];
  skills: string[];
  projects: SourceProject[];
  certifications: SourceCertification[];
  interests: string[];
}

export function emptySourceProfile(): LinkedInSourceProfile {
  return {
    fullName: '',
    headline: '',
    summary: '',
    location: '',
    industry: '',
    profileUrl: '',
    positions: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    interests: [],
  };
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/**
 * Normalises the date formats LinkedIn uses ("Jan 2020", "January 2020", "2020", "01/2020",
 * "2020-01", "2020-01-15") to 'YYYY-MM' or 'YYYY'. Anything unrecognised becomes ''.
 */
export function parsePartialDate(value: string | null | undefined): string {
  const text = (value ?? '').trim().toLowerCase();
  if (!text) return '';
  let match = /^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/.exec(text);
  if (match) return `${match[1]}-${match[2].padStart(2, '0')}`;
  match = /^(\d{1,2})\/(\d{4})$/.exec(text);
  if (match) return `${match[2]}-${match[1].padStart(2, '0')}`;
  match = /^([a-z]{3})[a-z]*\.?\s+(\d{4})$/.exec(text);
  if (match) {
    const month = MONTHS.indexOf(match[1]);
    if (month >= 0) return `${match[2]}-${String(month + 1).padStart(2, '0')}`;
  }
  match = /^(\d{4})$/.exec(text);
  return match ? match[1] : '';
}

export function yearOf(value: string | null | undefined): number | null {
  const match = /(19|20)\d{2}/.exec(value ?? '');
  return match ? Number(match[0]) : null;
}

/** Collapses whitespace and removes control characters. */
export function clean(value: unknown): string {
  return typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/[ \t ]+/g, ' ').trim() : '';
}
