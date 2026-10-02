import { Camera, CircleAlert, ImageUp, Trash2, ZoomIn, ZoomOut } from 'lucide-react';
import { type ChangeEvent, type DragEvent, type PointerEvent, useEffect, useRef, useState } from 'react';
import { api } from '../../api';
import { errorMessage } from '../../api/client';
import { useAuth, useCurrentUser } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { cx } from '../../utils/format';
import { type Crop, ImageError, clampCrop, cropToSquare, validateImageFile } from '../../utils/image';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

const FRAME = 280;
const ACCEPT = 'image/jpeg,image/png,image/webp';

interface CropDialogProps {
  image: HTMLImageElement;
  onCancel: () => void;
  onConfirm: (blob: Blob) => Promise<void>;
}

/** Position and zoom the photo inside a square frame, by dragging, with the slider, or with the arrow keys. */
function CropDialog({ image, onCancel, onConfirm }: CropDialogProps) {
  const [crop, setCrop] = useState<Crop>({ zoom: 1, offsetX: 0, offsetY: 0 });
  const [saving, setSaving] = useState(false);
  const drag = useRef<{ x: number; y: number; crop: Crop } | null>(null);

  const shortest = Math.min(image.naturalWidth, image.naturalHeight);
  const width = (image.naturalWidth / shortest) * FRAME * crop.zoom;
  const height = (image.naturalHeight / shortest) * FRAME * crop.zoom;
  const update = (next: Crop) => setCrop(clampCrop(next, image));

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, crop };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    update({
      zoom: crop.zoom,
      offsetX: drag.current.crop.offsetX + (event.clientX - drag.current.x) / FRAME,
      offsetY: drag.current.crop.offsetY + (event.clientY - drag.current.y) / FRAME,
    });
  };
  const nudge = (dx: number, dy: number) => update({ ...crop, offsetX: crop.offsetX + dx, offsetY: crop.offsetY + dy });

  const confirm = async () => {
    setSaving(true);
    try {
      await onConfirm(await cropToSquare(image, crop));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onCancel}
      title="Position your photo"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={confirm} loading={saving}>
            {saving ? 'Uploading image…' : 'Use this photo'}
          </Button>
        </>
      }
    >
      <div className="cropper">
        <div
          className="cropper__frame"
          style={{ width: FRAME, height: FRAME }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          tabIndex={0}
          role="application"
          aria-label="Photo position. Use the arrow keys to move the photo."
          onKeyDown={(event) => {
            const step = 0.04;
            if (event.key === 'ArrowLeft') nudge(-step, 0);
            else if (event.key === 'ArrowRight') nudge(step, 0);
            else if (event.key === 'ArrowUp') nudge(0, -step);
            else if (event.key === 'ArrowDown') nudge(0, step);
            else return;
            event.preventDefault();
          }}
        >
          <img
            src={image.src}
            alt=""
            draggable={false}
            style={{
              width,
              height,
              transform: `translate(calc(-50% + ${crop.offsetX * FRAME}px), calc(-50% + ${crop.offsetY * FRAME}px))`,
            }}
          />
        </div>
        <label className="cropper__zoom">
          <ZoomOut aria-hidden />
          <span className="sr-only">Zoom</span>
          <input type="range" min={1} max={4} step={0.01} value={crop.zoom} onChange={(event) => update({ ...crop, zoom: Number(event.target.value) })} />
          <ZoomIn aria-hidden />
        </label>
        <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
          Drag the photo to position it. It is saved as a square and shown on your profile card.
        </p>
      </div>
    </Modal>
  );
}

/**
 * Profile photo: pick or drop a file, position it, and upload. The photo is saved straight away,
 * independently of the rest of the profile form, and always to the signed-in member's own profile.
 */
export function PhotoUploader({ name }: { name: string }) {
  const user = useCurrentUser();
  const { setUser } = useAuth();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [removing, setRemoving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const photoUrl = user.profile.photoUrl;

  // Release the preview image when the dialog closes.
  useEffect(() => () => void (image && URL.revokeObjectURL(image.src)), [image]);

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    try {
      validateImageFile(file);
      // The object URL stays alive while the crop dialog shows the picture; it is released on close.
      const preview = new Image();
      preview.src = URL.createObjectURL(file);
      await preview.decode();
      if (preview.naturalWidth === 0) throw new ImageError('That image could not be read. Try a different file.');
      setImage(preview);
    } catch (caught) {
      setError(caught instanceof ImageError ? caught.message : 'That image could not be read. Try a different file.');
    }
  };

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    void choose(event.target.files?.[0]);
    // Reset the input so choosing the same file again still fires a change event.
    event.target.value = '';
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void choose(event.dataTransfer.files[0]);
  };

  const uploadCropped = async (blob: Blob) => {
    setProgress(0);
    try {
      const { user: updated } = await api.profile.uploadPhoto(blob, setProgress);
      setUser(updated);
      setImage(null);
      toast('Profile photo saved.');
    } catch (caught) {
      setImage(null);
      setError(`Image upload failed. ${errorMessage(caught)}`);
    } finally {
      setProgress(null);
    }
  };

  const remove = async () => {
    setRemoving(true);
    setError('');
    try {
      const { user: updated } = await api.profile.removePhoto();
      setUser(updated);
      toast('Profile photo removed.');
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setRemoving(false);
    }
  };

  const busy = progress !== null || removing;

  return (
    <div className="photo-uploader">
      <div
        className={cx('photo-uploader__drop', dragging && 'is-dragging')}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <Avatar name={name || user.profile.fullName} photoUrl={photoUrl} size={88} />
        <div className="photo-uploader__body">
          <p className="field__label">Profile photo</p>
          <p className="field__hint">
            <ImageUp aria-hidden size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> Drag an image here, or choose a file. JPG,
            PNG or WebP, up to 12 MB.
          </p>
          <div className="photo-uploader__actions">
            <input ref={inputRef} type="file" accept={ACCEPT} className="sr-only" onChange={onFile} aria-label="Choose a profile photo" tabIndex={-1} />
            <Button size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
              <Camera aria-hidden />
              {photoUrl ? 'Replace photo' : 'Upload photo'}
            </Button>
            {photoUrl && (
              <Button size="sm" variant="ghost" loading={removing} disabled={busy} onClick={remove}>
                <Trash2 aria-hidden />
                Remove
              </Button>
            )}
          </div>
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

      {image && <CropDialog image={image} onCancel={() => setImage(null)} onConfirm={uploadCropped} />}
    </div>
  );
}
