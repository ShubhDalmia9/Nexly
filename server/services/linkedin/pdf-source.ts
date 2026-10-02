import { getDocumentProxy } from 'unpdf';
import { HttpError } from '../../lib/errors';
import {
  type LinkedInSourceProfile,
  type SourceEducation,
  type SourcePosition,
  clean,
  emptySourceProfile,
  parsePartialDate,
} from './types';

/**
 * Source: the PDF LinkedIn generates from a member's own profile (Profile → Resources → Save to PDF).
 *
 * That PDF has a fixed layout: a narrow left column (Contact, Top Skills, Languages,
 * Certifications) and a main column (name, headline, location, then Summary, Experience and
 * Education). This reads the text with its position and font size, splits the two columns, and
 * walks the sections. Nothing is fetched from LinkedIn.
 *
 * A PDF carries no structure, only positioned text, so this is necessarily heuristic. The result
 * is always shown to the member to check and edit before anything is saved.
 */

interface Line {
  text: string;
  /** Font size in points: headings and company names are set larger than body text. */
  size: number;
}

interface TextItem {
  str: string;
  transform: number[];
  height: number;
}

const SIDEBAR_HEADINGS = ['contact', 'top skills', 'languages', 'certifications', 'honors-awards', 'publications', 'patents'];
const MAIN_HEADINGS = ['summary', 'experience', 'education'];

const MONTH = '(?:January|February|March|April|May|June|July|August|September|October|November|December)';
const DATE_RANGE = new RegExp(`^((?:${MONTH} )?\\d{4}) - (Present|(?:${MONTH} )?\\d{4})(?: \\(.+\\))?$`);
const DURATION_ONLY = /^(\d+ years?( \d+ months?)?|\d+ months?)$/;
const PAGE_FOOTER = /^Page \d+ of \d+$/;

async function readColumns(bytes: Buffer): Promise<{ sidebar: Line[]; main: Line[] }> {
  let pdf: Awaited<ReturnType<typeof getDocumentProxy>>;
  try {
    pdf = await getDocumentProxy(new Uint8Array(bytes));
  } catch {
    throw new HttpError(400, 'IMPORT_UNREADABLE', 'That file could not be read as a PDF. Use the file LinkedIn’s “Save to PDF” produced, unchanged.');
  }

  type Placed = { text: string; page: number; x: number; y: number; size: number; width: number };
  const placed: Placed[] = [];
  for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, 30); pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    for (const raw of content.items) {
      const item = raw as Partial<TextItem> & { width?: number };
      if (typeof item.str !== 'string' || !item.str.trim() || !item.transform) continue;
      placed.push({
        text: item.str,
        page: pageNumber,
        x: item.transform[4],
        y: item.transform[5],
        size: Math.abs(item.transform[3]) || item.height || 0,
        width: item.width ?? 0,
      });
    }
  }
  if (placed.length === 0) {
    throw new HttpError(400, 'IMPORT_UNREADABLE', 'That PDF contains no readable text. It may be a scan or an image rather than LinkedIn’s own PDF.');
  }

  // The member's name is the largest text on the first page and sits at the left edge of the
  // main column. Anything well to the left of it belongs to the sidebar.
  const firstPage = placed.filter((item) => item.page === 1);
  const name = firstPage.reduce((largest, item) => (item.size > largest.size ? item : largest), firstPage[0]);
  const split = firstPage.some((item) => item.x < name.x - 60) ? name.x - 8 : Number.NEGATIVE_INFINITY;

  const toLines = (items: Placed[]): Line[] => {
    const sorted = [...items].sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x);
    const lines: { page: number; y: number; parts: Placed[] }[] = [];
    for (const item of sorted) {
      const line = lines[lines.length - 1];
      if (line && line.page === item.page && Math.abs(line.y - item.y) <= 2) line.parts.push(item);
      else lines.push({ page: item.page, y: item.y, parts: [item] });
    }
    return lines
      .map((line) => {
        const parts = line.parts.sort((a, b) => a.x - b.x);
        let text = '';
        let end = 0;
        for (const part of parts) {
          // Insert a space between fragments that are visibly apart.
          if (text && !/\s$/.test(text) && !/^\s/.test(part.text) && part.x - end > part.size * 0.15) text += ' ';
          text += part.text;
          end = part.x + part.width;
        }
        return { text: clean(text), size: Math.max(...parts.map((part) => part.size)) };
      })
      .filter((line) => line.text && !PAGE_FOOTER.test(line.text));
  };

  return {
    sidebar: toLines(placed.filter((item) => item.x < split)),
    main: toLines(placed.filter((item) => item.x >= split)),
  };
}

/** Groups lines under the headings that introduce them. Lines before the first heading go under ''. */
function sections(lines: Line[], headings: string[]): Map<string, Line[]> {
  const result = new Map<string, Line[]>([['', []]]);
  let current = '';
  for (const line of lines) {
    const key = line.text.toLowerCase();
    if (headings.includes(key)) {
      current = key;
      if (!result.has(current)) result.set(current, []);
    } else {
      result.get(current)!.push(line);
    }
  }
  return result;
}

const looksLikePlace = (text: string): boolean =>
  text.length <= 70 &&
  !/[.!?:;]$/.test(text) &&
  (text.includes(',') || /\b(Area|Remote|Hybrid|Region|Metropolitan)\b/.test(text) || /^[A-Z][\p{L}.'-]+( [A-Z][\p{L}.'-]+){0,3}$/u.test(text));

function parseExperience(lines: Line[]): SourcePosition[] {
  const dateIndexes = lines.flatMap((line, index) => (index > 0 && DATE_RANGE.test(line.text) ? [index] : []));
  // LinkedIn sets company names larger than titles. If the file gives no usable size differences,
  // fall back to position alone.
  const sized = new Set(lines.map((line) => line.size.toFixed(1))).size > 1;

  const entries: { headerStart: number; fixedEnd: number; position: SourcePosition }[] = [];
  let company = '';
  for (const dateIndex of dateIndexes) {
    const previousEnd = entries.length > 0 ? entries[entries.length - 1].fixedEnd : -1;
    const titleLine = lines[dateIndex - 1];
    let headerStart = dateIndex - 1;

    // Skip the "4 years 2 months" total shown under a company with several roles.
    let candidate = dateIndex - 2;
    if (candidate > previousEnd && DURATION_ONLY.test(lines[candidate].text)) candidate -= 1;
    if (candidate > previousEnd) {
      const isCompany = sized ? lines[candidate].size > titleLine.size + 0.2 : true;
      if (isCompany || entries.length === 0) {
        company = lines[candidate].text;
        headerStart = candidate;
        // A long company name can wrap onto a second line of the same size.
        while (sized && headerStart - 1 > previousEnd && lines[headerStart - 1].size === lines[headerStart].size) {
          headerStart -= 1;
          company = `${lines[headerStart].text} ${company}`;
        }
      }
    }

    const match = DATE_RANGE.exec(lines[dateIndex].text)!;
    // The line after the dates is the role's location when it reads like a place, is set in the
    // same small type as the dates, and is not already the title or company of the next role.
    const next = lines[dateIndex + 1];
    const nextIsHeader = next !== undefined && dateIndexes.includes(dateIndex + 2);
    const sameTypeAsDates = next !== undefined && (!sized || Math.abs(next.size - lines[dateIndex].size) < 0.2);
    const hasLocation =
      next !== undefined && !nextIsHeader && sameTypeAsDates && !DATE_RANGE.test(next.text) && looksLikePlace(next.text);

    entries.push({
      headerStart,
      fixedEnd: hasLocation ? dateIndex + 1 : dateIndex,
      position: {
        title: titleLine.text,
        company,
        location: hasLocation ? next.text : '',
        start: parsePartialDate(match[1]),
        end: match[2] === 'Present' ? '' : parsePartialDate(match[2]),
        current: match[2] === 'Present',
        description: '',
      },
    });
  }

  // Everything between one role's fixed lines and the next role's header is its description.
  entries.forEach((entry, index) => {
    const until = index + 1 < entries.length ? entries[index + 1].headerStart : lines.length;
    entry.position.description = lines
      .slice(entry.fixedEnd + 1, until)
      .map((line) => line.text)
      .join(' ');
  });
  return entries.map((entry) => entry.position);
}

function parseEducation(lines: Line[]): SourceEducation[] {
  const isDetail = (text: string) => text.includes('·') || /\((?:[A-Za-z]+ )?\d{4}(?: - (?:[A-Za-z]+ )?\d{4})?\)$/.test(text);
  const largest = Math.max(...lines.map((line) => line.size), 0);
  const sized = new Set(lines.map((line) => line.size.toFixed(1))).size > 1;

  const result: SourceEducation[] = [];
  let detail: string[] = [];
  const finish = () => {
    const entry = result[result.length - 1];
    if (!entry || detail.length === 0) return;
    const text = detail.join(' ');
    const years = [...text.matchAll(/(?:19|20)\d{2}/g)].map((match) => Number(match[0]));
    // "Bachelor of Technology - BTech, Computer Science · (2015 - 2019)"
    const [degree, ...field] = text.split('·')[0].replace(/\(.*$/, '').split(',');
    entry.degree = clean(degree);
    entry.field = clean(field.join(','));
    entry.startYear = years.length > 1 ? years[0] : null;
    entry.endYear = years.length > 0 ? years[years.length - 1] : null;
    detail = [];
  };

  for (const line of lines) {
    const isSchool = sized ? line.size >= largest - 0.2 : !isDetail(line.text) && detail.length > 0;
    if (result.length === 0 || isSchool) {
      finish();
      result.push({ school: line.text, degree: '', field: '', startYear: null, endYear: null });
    } else {
      detail.push(line.text);
    }
  }
  finish();
  return result;
}

/** Reads a LinkedIn "Save to PDF" profile. */
export async function profileFromPdf(bytes: Buffer): Promise<LinkedInSourceProfile> {
  const { sidebar, main } = await readColumns(bytes);
  const side = sections(sidebar, SIDEBAR_HEADINGS);
  const body = sections(main, MAIN_HEADINGS);

  const contact = (side.get('contact') ?? []).map((line) => line.text);
  // The URL often wraps across two lines in the narrow column, so search the lines joined together.
  const urlMatch = /linkedin\.com\/in\/([A-Za-z0-9\-_%]+)/i.exec(contact.join(''));

  const hasLinkedInShape = Boolean(urlMatch) || body.has('experience') || body.has('education') || side.has('top skills');
  if (!hasLinkedInShape) {
    throw new HttpError(
      400,
      'IMPORT_NOT_LINKEDIN',
      'That PDF does not look like a LinkedIn profile. On your LinkedIn profile choose Resources (or More) → Save to PDF, and upload that file.',
    );
  }

  const profile = emptySourceProfile();
  const intro = body.get('') ?? [];
  profile.fullName = intro[0]?.text ?? '';
  const rest = intro.slice(1).map((line) => line.text);
  if (rest.length > 1 && looksLikePlace(rest[rest.length - 1])) profile.location = rest.pop()!;
  profile.headline = rest.join(' ');

  profile.summary = (body.get('summary') ?? []).map((line) => line.text).join(' ');
  profile.positions = parseExperience(body.get('experience') ?? []);
  profile.education = parseEducation(body.get('education') ?? []);
  profile.skills = (side.get('top skills') ?? []).map((line) => line.text);
  profile.certifications = (side.get('certifications') ?? []).map((line) => ({ name: line.text, issuer: '', year: null }));
  if (urlMatch) profile.profileUrl = `https://www.linkedin.com/in/${urlMatch[1]}`;
  return profile;
}
