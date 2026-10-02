import { CircleAlert, type LucideIcon, RefreshCw } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { cx } from '../../utils/format';
import { Button } from './Button';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  className?: string;
  style?: CSSProperties;
}

export function Skeleton({ width = '100%', height = 14, radius, className, style }: SkeletonProps) {
  return <span className={cx('skeleton', className)} style={{ width, height, borderRadius: radius, ...style }} aria-hidden />;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  text?: ReactNode;
  children?: ReactNode;
}

export function EmptyState({ icon: Icon, title, text, children }: EmptyStateProps) {
  return (
    <div className="state">
      <div className="state__icon">
        <Icon aria-hidden />
      </div>
      <h3 className="state__title">{title}</h3>
      {text && <p className="state__text">{text}</p>}
      {children && <div className="state__actions">{children}</div>}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'That did not load', message, onRetry }: ErrorStateProps) {
  return (
    <div className="state state--error" role="alert">
      <div className="state__icon">
        <CircleAlert aria-hidden />
      </div>
      <h3 className="state__title">{title}</h3>
      <p className="state__text">{message}</p>
      {onRetry && (
        <div className="state__actions">
          <Button onClick={onRetry}>
            <RefreshCw aria-hidden />
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}

interface ProgressRingProps {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
}

export function ProgressRing({ value, size = 72, stroke = 7, label }: ProgressRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cx('ring', clamped === 100 && 'ring--done')}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${clamped}% complete`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle className="ring__track" cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} />
        <circle
          className="ring__value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
        />
      </svg>
      <span className="ring__label" style={{ fontSize: size * 0.26 }} aria-hidden>
        {clamped}%
      </span>
    </div>
  );
}

export function PageLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="state" role="status" style={{ minHeight: '50dvh', justifyContent: 'center' }}>
      <span className="spinner spinner--lg" aria-hidden />
      <span className="sr-only">{label}</span>
    </div>
  );
}
