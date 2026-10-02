// A minimal PDF writer: positioned Helvetica text on US-Letter pages. It exists so the PDF import
// can be exercised without a real LinkedIn file, by laying text out the way LinkedIn's
// "Save to PDF" does (a narrow left column and a main column, with its heading sizes).

export interface PdfText {
  text: string;
  x: number;
  y: number;
  size: number;
  page?: number;
}

const escape = (text: string) => text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

export function makePdf(items: PdfText[]): Buffer {
  const pageCount = Math.max(1, ...items.map((item) => item.page ?? 1));
  const objects: string[] = [];
  const pageIds: number[] = [];

  // 1: catalog, 2: page tree, 3: font, then a page object and a content stream per page.
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  for (let page = 1; page <= pageCount; page += 1) {
    const stream = items
      .filter((item) => (item.page ?? 1) === page)
      .map((item) => `BT /F1 ${item.size} Tf 1 0 0 1 ${item.x} ${item.y} Tm (${escape(item.text)}) Tj ET`)
      .join('\n');
    const pageId = objects.length;
    const contentId = pageId + 1;
    pageIds.push(pageId);
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`;
  }
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageCount} >>`;

  let body = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = Buffer.byteLength(body, 'latin1');
    body += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(body, 'latin1');
  body += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id += 1) body += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  body += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body, 'latin1');
}

/** A fictional profile laid out like LinkedIn's "Save to PDF" output. */
export function sampleLinkedInPdf(): Buffer {
  const side = 22;
  const main = 223;
  const items: PdfText[] = [];
  let y = 740;
  const sideLine = (text: string, size = 10.5, gap = 16) => {
    items.push({ text, x: side, y, size });
    y -= gap;
  };
  sideLine('Contact', 13, 20);
  sideLine('tara@example.com');
  sideLine('www.linkedin.com/in/tara-');
  sideLine('venkatesan-4b2a91 (LinkedIn)', 10.5, 26);
  sideLine('Top Skills', 13, 20);
  sideLine('Robotics');
  sideLine('Python (Programming Language)');
  sideLine('Robot Operating System (ROS)', 10.5, 26);
  sideLine('Certifications', 13, 20);
  sideLine('Functional Safety for Machinery');

  let page = 1;
  y = 740;
  const mainLine = (text: string, size = 10.5, gap = 15) => {
    if (y < 60) {
      items.push({ text: `Page ${page} of 2`, x: 280, y: 30, size: 9, page });
      page += 1;
      y = 740;
    }
    items.push({ text, x: main, y, size, page });
    y -= gap;
  };
  mainLine('Tara Venkatesan', 26, 30);
  mainLine('Robotics Engineer at Orbit Mechatronics | Mobile manipulation', 12, 17);
  mainLine('Pune, Maharashtra, India', 12, 30);
  mainLine('Summary', 15.75, 22);
  mainLine('I build software and controls for mobile robots that pick, carry and place');
  mainLine('things in busy spaces. I mentor students in a weekend robotics club.', 10.5, 28);
  mainLine('Experience', 15.75, 22);
  mainLine('Orbit Mechatronics', 12, 16);
  mainLine('Robotics Engineer', 11.5, 15);
  mainLine('March 2023 - Present (3 years 8 months)');
  mainLine('Pune, India');
  mainLine('Lead the manipulation stack for a mobile picking robot: grasp planning,');
  mainLine('arm control and the ROS interfaces to perception.', 10.5, 24);
  mainLine('Fernhill Automation', 12, 16);
  mainLine('3 years 2 months');
  mainLine('Controls Engineer', 11.5, 15);
  mainLine('July 2020 - February 2023 (2 years 8 months)');
  mainLine('Chennai, India');
  mainLine('Designed and tuned motion controllers for conveyor and gantry systems.', 10.5, 20);
  mainLine('Engineering Intern', 11.5, 15);
  mainLine('January 2020 - June 2020 (6 months)');
  mainLine('Built a vision-based part counter for a packaging line.', 10.5, 28);
  mainLine('Education', 15.75, 22);
  mainLine('Deccan Institute of Engineering', 12, 16);
  mainLine('Bachelor of Technology - BTech, Mechatronics Engineering · (2016 - 2020)');
  items.push({ text: `Page ${page} of ${page}`, x: 280, y: 30, size: 9, page });
  return makePdf(items);
}
