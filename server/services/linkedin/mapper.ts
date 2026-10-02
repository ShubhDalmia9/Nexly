import { LIMITS, PROJECT_TYPES, parseLinkedInUrl } from '../../../shared/constants';
import type { Certification, Education, Experience, ImportableField, ProfileInput, Project } from '../../../shared/types';
import { type LinkedInSourceProfile, clean } from './types';

/**
 * The mapping layer between LinkedIn data and Nexly's profile schema.
 *
 *   LinkedIn                         Nexly
 *   ------------------------------   -----------------------------------------------
 *   name                         →   fullName
 *   headline                     →   headline (and profession, if there is no current role)
 *   current position title       →   profession
 *   current position company     →   workplace (current work)
 *   location                     →   location
 *   about / summary              →   about
 *   positions                    →   experience (work history)
 *   education                    →   education
 *   skills                       →   skills (matched to Nexly's existing tags where possible)
 *   projects                     →   projects
 *   certifications               →   certifications
 *   causes, interests, industry  →   interests
 *
 * Only information the source actually contained is mapped. Career goals, specialisation and
 * "who you want to meet" do not exist on LinkedIn and are left for the member to add.
 */

export interface Vocabulary {
  skills: string[];
  interests: string[];
}

export interface MappedProfile {
  draft: Partial<ProfileInput>;
  imported: ImportableField[];
  notes: string[];
}

const key = (value: string) => value.trim().toLowerCase();

/** Shortens text to a limit at a sentence or word boundary. */
function fit(text: string, max: number): { value: string; shortened: boolean } {
  const value = clean(text);
  if (value.length <= max) return { value, shortened: false };
  const slice = value.slice(0, max - 1);
  const sentence = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '));
  const cut = sentence > max * 0.6 ? sentence + 1 : slice.lastIndexOf(' ');
  return { value: `${slice.slice(0, cut > 0 ? cut : max - 1).trimEnd()}…`, shortened: true };
}

/** Removes case-insensitive duplicates, keeping the first spelling and the original order. */
function unique(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const id = key(value);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/**
 * Matches a LinkedIn tag to Nexly's vocabulary so that "python (programming language)" joins the
 * existing "Python" tag instead of creating a near-duplicate that nobody else has.
 */
function canonicalTag(raw: string, vocabulary: Map<string, string>): string {
  const full = clean(raw);
  const inside = /\(([^)]+)\)/.exec(full)?.[1] ?? '';
  const outside = clean(full.replace(/\([^)]*\)/g, ' '));
  for (const candidate of [full, outside, inside]) {
    const known = vocabulary.get(key(candidate));
    if (known) return known;
  }
  return (outside || full).slice(0, LIMITS.tag);
}

/** Finds vocabulary tags mentioned in free text, longest first so "User Research" beats "Research". */
function tagsMentionedIn(text: string, vocabulary: string[], limit: number): string[] {
  const exact = ` ${text.replace(/\s+/g, ' ')} `;
  const lower = exact.toLowerCase();
  const found: { term: string; start: number; end: number }[] = [];
  for (const term of [...vocabulary].sort((a, b) => b.length - a.length)) {
    if (term.length < 2) continue;
    // Short tags such as "Go" or "AI" are only trusted when the capitalisation matches.
    const caseSensitive = term.length <= 3;
    const needle = (caseSensitive ? term : term.toLowerCase()).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(?<![A-Za-z0-9+#])${needle}(?![A-Za-z0-9+#])`, 'g');
    for (const match of (caseSensitive ? exact : lower).matchAll(pattern)) {
      const start = match.index;
      const end = start + match[0].length;
      if (found.some((entry) => start < entry.end && end > entry.start)) continue;
      found.push({ term, start, end });
      break;
    }
  }
  return found
    .sort((a, b) => a.start - b.start)
    .slice(0, limit)
    .map((entry) => entry.term);
}

/** "Robotics Engineer at Helix | Speaker" → { role: "Robotics Engineer", company: "Helix" }. */
function splitHeadline(headline: string): { role: string; company: string } {
  const first = headline.split(/\s+[|·•]\s+/)[0] ?? '';
  const match = /^(.*?)\s+(?:at|@)\s+(.+)$/i.exec(first);
  return match ? { role: clean(match[1]), company: clean(match[2]) } : { role: clean(first), company: '' };
}

function projectType(text: string): (typeof PROJECT_TYPES)[number] {
  const lower = text.toLowerCase();
  if (/open[- ]source|github/.test(lower)) return 'Open source';
  if (/research|paper|thesis|study/.test(lower)) return 'Research';
  if (/robot|hardware|pcb|drone|device|prototype/.test(lower)) return 'Hardware';
  if (/startup|founded|co-founded/.test(lower)) return 'Startup';
  if (/university|coursework|capstone|semester/.test(lower)) return 'Academic';
  return 'Side project';
}

export function mapLinkedInProfile(source: LinkedInSourceProfile, vocabulary: Vocabulary): MappedProfile {
  const draft: Partial<ProfileInput> = {};
  const imported: ImportableField[] = [];
  const notes: string[] = [];
  const skillVocabulary = new Map(vocabulary.skills.map((name) => [key(name), name]));
  const interestVocabulary = new Map(vocabulary.interests.map((name) => [key(name), name]));

  // ---- Identity
  const fullName = clean(source.fullName).slice(0, LIMITS.name);
  if (fullName.length >= 2) {
    draft.fullName = fullName;
    imported.push('fullName');
  }
  const headline = fit(source.headline, LIMITS.headline).value;
  if (headline) {
    draft.headline = headline;
    imported.push('headline');
  }

  // ---- Current role → profession and current work
  const current = source.positions.find((position) => position.current) ?? null;
  const fromHeadline = splitHeadline(source.headline);
  const profession = clean(current?.title || fromHeadline.role).slice(0, LIMITS.shortText);
  if (profession) {
    draft.profession = profession;
    imported.push('profession');
  }
  const workplace = clean(current?.company || fromHeadline.company).slice(0, LIMITS.shortText);
  if (workplace) {
    draft.workplace = workplace;
    imported.push('workplace');
  }

  const location = clean(source.location).slice(0, LIMITS.shortText);
  if (location) {
    draft.location = location;
    imported.push('location');
  }

  const about = fit(source.summary, LIMITS.about);
  if (about.value) {
    draft.about = about.value;
    imported.push('about');
    if (about.shortened) notes.push(`Your About text was longer than ${LIMITS.about.toLocaleString('en')} characters, so it was shortened.`);
  }

  // ---- Skills and interests
  const skills = unique(source.skills.map((skill) => canonicalTag(skill, skillVocabulary)));
  if (skills.length > 0) {
    draft.skills = skills.slice(0, LIMITS.skills);
    imported.push('skills');
    if (skills.length > LIMITS.skills) {
      notes.push(`You have ${skills.length} skills on LinkedIn. Nexly keeps up to ${LIMITS.skills}, so the first ${LIMITS.skills} were kept.`);
    }
  }
  const taken = new Set((draft.skills ?? []).map(key));
  const interests = unique(
    [...source.interests, source.industry].filter(Boolean).map((interest) => canonicalTag(interest, interestVocabulary)),
  ).filter((interest) => !taken.has(key(interest)));
  if (interests.length > 0) {
    draft.interests = interests.slice(0, LIMITS.interests);
    imported.push('interests');
  }

  // ---- Work history
  const experience: Experience[] = source.positions
    .filter((position) => clean(position.title) || clean(position.company))
    .slice(0, LIMITS.experience)
    .map((position) => ({
      title: (clean(position.title) || 'Role').slice(0, 100),
      company: clean(position.company).slice(0, 100),
      location: clean(position.location).slice(0, LIMITS.shortText),
      startDate: position.start,
      endDate: position.current ? '' : position.end,
      description: fit(position.description, 600).value,
    }));
  if (experience.length > 0) {
    draft.experience = experience;
    imported.push('experience');
  }

  const education: Education[] = source.education
    .filter((item) => clean(item.school))
    .slice(0, LIMITS.education)
    .map((item) => ({
      school: clean(item.school).slice(0, 120),
      degree: clean(item.degree).slice(0, 100),
      field: clean(item.field).slice(0, 100),
      startYear: item.startYear,
      endYear: item.endYear,
    }));
  if (education.length > 0) {
    draft.education = education;
    imported.push('education');
  }

  // ---- Projects
  const projects: Project[] = source.projects
    .filter((project) => clean(project.title))
    .slice(0, LIMITS.projects)
    .map((project) => {
      const text = `${project.title} ${project.description}`;
      const year = /(?:19|20)\d{2}/.exec(project.end || project.start)?.[0];
      return {
        title: clean(project.title).slice(0, LIMITS.projectTitle),
        description: fit(project.description, LIMITS.projectDescription).value,
        type: projectType(text),
        role: '',
        year: year ? Number(year) : null,
        url: /^https?:\/\/\S+$/i.test(project.url) && project.url.length <= 200 ? project.url : '',
        // Tag the project with any of the member's own skills that its description mentions.
        skills: tagsMentionedIn(text, unique([...(draft.skills ?? []), ...vocabulary.skills]), LIMITS.projectSkills),
        imageUrl: null,
      };
    });
  if (projects.length > 0) {
    draft.projects = projects;
    imported.push('projects');
  }

  const certifications: Certification[] = source.certifications
    .filter((item) => clean(item.name))
    .slice(0, LIMITS.certifications)
    .map((item) => ({ name: clean(item.name).slice(0, 120), issuer: clean(item.issuer).slice(0, 100), year: item.year }));
  if (certifications.length > 0) {
    draft.certifications = certifications;
    imported.push('certifications');
  }

  // ---- The member's own profile link, when the PDF carries it.
  const slug = parseLinkedInUrl(source.profileUrl);
  if (slug) draft.linkedinUrl = `https://www.linkedin.com/in/${slug}`;

  return { draft, imported, notes };
}
