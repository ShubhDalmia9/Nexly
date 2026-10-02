import { type CSSProperties, useState } from 'react';
import { cx, hueFor, initials } from '../../utils/format';

interface AvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: number;
  round?: boolean;
  className?: string;
}

/** A profile photo, falling back to coloured initials when there is no photo or it fails to load. */
export function Avatar({ name, photoUrl, size = 44, round, className }: AvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showPhoto = Boolean(photoUrl) && failedUrl !== photoUrl;
  const style = { '--size': `${size}px`, '--hue': hueFor(name) } as CSSProperties;

  return (
    <span className={cx('avatar', round && 'avatar--round', className)} style={style} aria-hidden>
      {showPhoto ? (
        <img src={photoUrl ?? undefined} alt="" draggable={false} onError={() => setFailedUrl(photoUrl ?? null)} />
      ) : (
        initials(name)
      )}
    </span>
  );
}
