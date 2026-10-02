import { CircleAlert, ImagePlus, Trash2 } from 'lucide-react';
import { type DragEvent, useRef, useState } from 'react';
import { api } from '../../api';
import { errorMessage } from '../../api/client';
import { cx } from '../../utils/format';
import { ImageError, resizeToFit } from '../../utils/image';
import { Button } from '../ui/Button';

interface ProjectImageFieldProps {
  imageUrl: string | null;
  onChange: (imageUrl: string | null) => void;
  label: string;
}

/**
 * A cover image for a project: pick or drop a file, which is scaled down in the browser and
 * uploaded. The image is attached to the project when the profile is saved.
 */
export function ProjectImageField({ imageUrl, onChange, label }: ProjectImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    try {
      const blob = await resizeToFit(file, 1280, 960);
      setProgress(0);
      const { url } = await api.profile.uploadProjectImage(blob, setProgress);
      onChange(url);
    } catch (caught) {
      setError(caught instanceof ImageError ? caught.message : `Image upload failed. ${errorMessage(caught)}`);
    } finally {
      setProgress(null);
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void choose(event.dataTransfer.files[0]);
  };

  return (
    <div className="field">
      <span className="field__label">
        <span>
          {label} <span className="field__optional">(optional)</span>
        </span>
      </span>
      <div
        className={cx('image-drop', dragging && 'is-dragging', imageUrl && 'has-image')}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="Project image preview" />
        ) : (
          <p>
            <ImagePlus aria-hidden />
            Drag an image here, or choose a file. JPG, PNG or WebP.
          </p>
        )}
        <div className="image-drop__actions">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            tabIndex={-1}
            aria-label={`Choose ${label.toLowerCase()}`}
            onChange={(event) => {
              void choose(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
          <Button size="sm" disabled={progress !== null} onClick={() => inputRef.current?.click()}>
            {imageUrl ? 'Replace image' : 'Choose image'}
          </Button>
          {imageUrl && (
            <Button size="sm" variant="ghost" onClick={() => onChange(null)}>
              <Trash2 aria-hidden />
              Remove
            </Button>
          )}
        </div>
      </div>
      {progress !== null && (
        <div className="upload-progress" role="status">
          <progress value={progress} max={1} aria-label="Upload progress" />
          <span>Uploading image… {Math.round(progress * 100)}%</span>
        </div>
      )}
      {error && (
        <p className="field__error" role="alert">
          <CircleAlert aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}
