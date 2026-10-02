import { Check, CircleAlert, FileArchive, FileText, FileUp } from 'lucide-react';
import { type DragEvent, useRef, useState } from 'react';
import { LIMITS } from '../../../shared/constants';
import type { LinkedInImportResult } from '../../../shared/types';
import { api } from '../../api';
import { errorMessage } from '../../api/client';
import { cx } from '../../utils/format';
import { Button } from '../ui/Button';

interface LinkedInImportProps {
  /** Receives the details read from the file. Nothing has been saved to the profile at this point. */
  onResult: (result: LinkedInImportResult) => void;
  onCancel: () => void;
  /** The label of the button that leaves the import, e.g. "Back" on a page or "Cancel" in a dialog. */
  cancelLabel?: string;
}

const STAGES = ['Uploading your file', 'Reading your profile', 'Preparing your review'] as const;

/**
 * Import a profile from a LinkedIn profile PDF or a LinkedIn data export ZIP. Choosing or dropping
 * the file starts the import; the result goes to the review screen and is not saved here.
 */
export function LinkedInImport({ onResult, onCancel, cancelLabel = 'Back' }: LinkedInImportProps) {
  const pdfRef = useRef<HTMLInputElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [running, setRunning] = useState<{ stage: number; progress: number } | null>(null);

  const start = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    if (!/\.(pdf|zip)$/i.test(file.name)) {
      setError('Please upload a PDF or ZIP file.');
      return;
    }
    if (file.size > LIMITS.importFileBytes) {
      setError(`That file is too large. The limit is ${LIMITS.importFileBytes / 1024 / 1024} MB.`);
      return;
    }

    setRunning({ stage: 0, progress: 0 });
    try {
      const result = await api.linkedin.importFile(file, (fraction) => setRunning({ stage: fraction >= 1 ? 1 : 0, progress: fraction }));
      setRunning({ stage: 2, progress: 1 });
      // Leave the completed steps on screen for a moment before the review replaces them.
      window.setTimeout(() => onResult(result), 450);
    } catch (caught) {
      setRunning(null);
      setError(errorMessage(caught));
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void start(event.dataTransfer.files[0]);
  };

  if (running) {
    return (
      <div className="import import--running" role="status" aria-live="polite">
        <h2 className="import__title">Importing your profile…</h2>
        <ol className="import-steps">
          {STAGES.map((label, index) => (
            <li key={label} className={cx(index < running.stage && 'is-done', index === running.stage && 'is-active')}>
              <span className="import-steps__mark" aria-hidden>
                {index < running.stage ? <Check /> : index === running.stage ? <span className="spinner" /> : null}
              </span>
              <span>
                {label}
                {index === 0 && running.stage === 0 && ` (${Math.round(running.progress * 100)}%)`}
              </span>
            </li>
          ))}
        </ol>
        {running.stage === 0 && <progress value={running.progress} max={1} aria-label="Upload progress" />}
      </div>
    );
  }

  return (
    <div className="import">
      <div
        className={cx('file-drop', dragging && 'is-dragging')}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input
          ref={pdfRef}
          type="file"
          accept=".pdf,application/pdf"
          className="sr-only"
          tabIndex={-1}
          aria-label="Choose your LinkedIn profile PDF"
          onChange={(event) => {
            void start(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        <input
          ref={zipRef}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          className="sr-only"
          tabIndex={-1}
          aria-label="Choose your LinkedIn data export ZIP"
          onChange={(event) => {
            void start(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        <FileUp aria-hidden />
        <p>
          <strong>Drag your LinkedIn PDF or data export ZIP here</strong>
          <span>or choose a file</span>
        </p>
        <div className="file-drop__choices">
          <Button variant="primary" size="lg" onClick={() => pdfRef.current?.click()}>
            <FileText aria-hidden />
            Upload LinkedIn PDF
          </Button>
          <Button size="lg" onClick={() => zipRef.current?.click()}>
            <FileArchive aria-hidden />
            Upload data export ZIP
          </Button>
        </div>
      </div>

      {error && (
        <p className="notice notice--error" role="alert">
          <CircleAlert aria-hidden />
          <span>{error}</span>
        </p>
      )}

      <details className="import__help">
        <summary>Where do I find these files?</summary>
        <ol>
          <li>
            <strong>LinkedIn PDF.</strong> Open your profile on LinkedIn, select <em>Resources</em> (or <em>More</em>), then{' '}
            <em>Save to PDF</em>.
          </li>
          <li>
            <strong>Data export ZIP.</strong> In LinkedIn, open <em>Settings</em> → <em>Data privacy</em> → <em>Get a copy of your data</em>,
            and upload the ZIP LinkedIn sends you. It also includes your projects and full skills list.
          </li>
        </ol>
      </details>

      <div className="import__actions">
        <Button variant="ghost" onClick={onCancel}>
          {cancelLabel}
        </Button>
      </div>
    </div>
  );
}
