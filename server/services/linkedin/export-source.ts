import { unzipSync } from 'fflate';
import { HttpError } from '../../lib/errors';
import { type LinkedInSourceProfile, clean, emptySourceProfile, parsePartialDate, yearOf } from './types';

/**
 * Source: the member's own LinkedIn data export.
 *
 * LinkedIn lets every member download their data (Settings → Data privacy → Get a copy of your
 * data). The archive is a ZIP of CSV files: Profile.csv, Positions.csv, Education.csv, Skills.csv,
 * Projects.csv, Certifications.csv and others. This reads those files.
 */

const MAX_CSV_BYTES = 4 * 1024 * 1024;

/** A small RFC 4180 CSV reader: quoted fields, doubled quotes and line breaks inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const input = text.replace(/^﻿/, '');

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[index + 1] === '\n') index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''));
}

/**
 * Turns a CSV into records keyed by column name. Some LinkedIn files begin with a few lines of
 * notes before the header, so the header is the first row that contains an expected column.
 */
function records(text: string, expectedColumn: string): Record<string, string>[] {
  const rows = parseCsv(text);
  const headerIndex = rows.findIndex((cells) => cells.some((cell) => cell.trim().toLowerCase() === expectedColumn.toLowerCase()));
  if (headerIndex < 0) return [];
  const header = rows[headerIndex].map((cell) => cell.trim().toLowerCase());
  return rows.slice(headerIndex + 1).map((cells) => {
    const record: Record<string, string> = {};
    header.forEach((name, column) => {
      record[name] = clean(cells[column] ?? '');
    });
    return record;
  });
}

/** Builds a profile from the export's CSV files, keyed by lower-case file name (e.g. "positions.csv"). */
export function profileFromCsvFiles(files: Map<string, string>): LinkedInSourceProfile {
  const profile = emptySourceProfile();
  const file = (name: string) => files.get(name) ?? '';

  const basics = records(file('profile.csv'), 'First Name')[0];
  if (basics) {
    profile.fullName = clean(`${basics['first name'] ?? ''} ${basics['last name'] ?? ''}`);
    profile.headline = basics['headline'] ?? '';
    profile.summary = basics['summary'] ?? '';
    profile.industry = basics['industry'] ?? '';
    profile.location = basics['geo location'] ?? '';
  }

  profile.positions = records(file('positions.csv'), 'Company Name')
    .map((row) => {
      const end = parsePartialDate(row['finished on']);
      return {
        title: row['title'] ?? '',
        company: row['company name'] ?? '',
        location: row['location'] ?? '',
        start: parsePartialDate(row['started on']),
        end,
        current: end === '',
        description: row['description'] ?? '',
      };
    })
    .filter((position) => position.title || position.company)
    // Current roles first, then most recent.
    .sort((a, b) => Number(b.current) - Number(a.current) || b.start.localeCompare(a.start));

  profile.education = records(file('education.csv'), 'School Name')
    .map((row) => {
      // "Degree Name" is often "Bachelor of Science - BS, Computer Science" or just the degree.
      const [degree, ...field] = (row['degree name'] ?? '').split(',');
      return {
        school: row['school name'] ?? '',
        degree: clean(degree),
        field: clean(field.join(',')),
        startYear: yearOf(row['start date']),
        endYear: yearOf(row['end date']),
      };
    })
    .filter((item) => item.school);

  profile.skills = records(file('skills.csv'), 'Name')
    .map((row) => row['name'])
    .filter(Boolean);

  profile.projects = records(file('projects.csv'), 'Title')
    .map((row) => ({
      title: row['title'] ?? '',
      description: row['description'] ?? '',
      url: row['url'] ?? '',
      start: parsePartialDate(row['started on']),
      end: parsePartialDate(row['finished on']),
    }))
    .filter((project) => project.title);

  profile.certifications = records(file('certifications.csv'), 'Name')
    .map((row) => ({ name: row['name'] ?? '', issuer: row['authority'] ?? '', year: yearOf(row['started on']) ?? yearOf(row['finished on']) }))
    .filter((item) => item.name);

  profile.interests = records(file('causes you care about.csv'), 'Supported Cause')
    .map((row) => row['supported cause'])
    .filter(Boolean);

  return profile;
}

/** Reads a LinkedIn data-export ZIP. */
export function profileFromExportZip(bytes: Buffer): LinkedInSourceProfile {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(new Uint8Array(bytes), {
      // Only the CSV files are needed; skipping the rest also caps how much is ever decompressed.
      filter: (entry) => /\.csv$/i.test(entry.name) && entry.originalSize <= MAX_CSV_BYTES,
    });
  } catch {
    throw new HttpError(400, 'IMPORT_UNREADABLE', 'That ZIP file could not be opened. Upload the data export LinkedIn sent you, unchanged.');
  }

  const decoder = new TextDecoder('utf-8');
  const files = new Map<string, string>();
  for (const [name, content] of Object.entries(entries)) {
    files.set(name.split('/').pop()!.toLowerCase(), decoder.decode(content));
  }
  if (!files.has('profile.csv') && !files.has('positions.csv') && !files.has('skills.csv')) {
    throw new HttpError(
      400,
      'IMPORT_NOT_LINKEDIN',
      'That ZIP does not look like a LinkedIn data export. Upload the file LinkedIn sent you, unchanged.',
    );
  }
  return profileFromCsvFiles(files);
}
