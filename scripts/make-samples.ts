// Writes the fictional sample files for trying the LinkedIn import:
//   samples/linkedin-profile-sample.pdf        laid out like the PDF LinkedIn produces with "Save to PDF"
//   samples/linkedin-data-export-sample.zip    the CSVs in samples/linkedin-export, zipped like a data export
// Usage: npx tsx scripts/make-samples.ts
import fs from 'node:fs';
import path from 'node:path';
import { zipSync } from 'fflate';
import { sampleLinkedInPdf } from './lib/make-pdf';

const samples = path.join(import.meta.dirname, '..', 'samples');
const exportDir = path.join(samples, 'linkedin-export');

const files: Record<string, Uint8Array> = {};
for (const name of fs.readdirSync(exportDir)) {
  files[`Basic_LinkedInDataExport/${name}`] = fs.readFileSync(path.join(exportDir, name));
}
fs.writeFileSync(path.join(samples, 'linkedin-data-export-sample.zip'), zipSync(files));
fs.writeFileSync(path.join(samples, 'linkedin-profile-sample.pdf'), sampleLinkedInPdf());
console.log('Wrote samples/linkedin-data-export-sample.zip and samples/linkedin-profile-sample.pdf');
