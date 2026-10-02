import type { LinkedInImportResult } from '../../../shared/types';
import { all } from '../../db/connection';
import { HttpError } from '../../lib/errors';
import { profileFromExportZip } from './export-source';
import { mapLinkedInProfile } from './mapper';
import { profileFromPdf } from './pdf-source';

/**
 * LinkedIn profile import.
 *
 * A member uploads one of the two files LinkedIn gives them: the PDF of their profile
 * ("Save to PDF") or their data export (a ZIP of CSV files). Either is read, mapped onto Nexly's
 * profile fields and returned as a draft. Nothing is stored here: the draft only reaches the
 * member's profile when they review it and save.
 */

function vocabulary() {
  return {
    skills: all<{ name: string }>('SELECT name FROM skills WHERE curated = 1').map((row) => row.name),
    interests: all<{ name: string }>('SELECT name FROM interests WHERE curated = 1').map((row) => row.name),
  };
}

const isPdf = (bytes: Buffer) => bytes.subarray(0, 5).toString('latin1') === '%PDF-';
const isZip = (bytes: Buffer) => bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05);

export async function importFromFile(input: { bytes: Buffer; fileName: string }): Promise<LinkedInImportResult> {
  // The file is identified by its contents, not by its name.
  const source = isPdf(input.bytes) ? await profileFromPdf(input.bytes) : isZip(input.bytes) ? profileFromExportZip(input.bytes) : null;
  if (!source) {
    throw new HttpError(415, 'UNSUPPORTED_IMPORT_FILE', 'Please upload a PDF or ZIP file from LinkedIn.');
  }
  const mapped = mapLinkedInProfile(source, vocabulary());
  if (mapped.imported.length === 0) {
    throw new HttpError(422, 'IMPORT_EMPTY', 'No profile details could be found in that file. You can fill in your profile by hand instead.');
  }
  return {
    fileName: input.fileName.replace(/[^\w.\- ()]/g, '').slice(0, 80) || 'your file',
    draft: mapped.draft,
    imported: mapped.imported,
    notes: mapped.notes,
  };
}
