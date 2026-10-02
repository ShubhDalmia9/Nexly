import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../../utils/format';

export type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'success' | 'danger' | 'dark';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonStyle {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  iconOnly?: boolean;
}

/** Class names for anything that should look like a button, including links. */
export function buttonClass({ variant = 'secondary', size = 'md', block, iconOnly }: ButtonStyle = {}, extra?: string): string {
  return cx('btn', `btn--${variant}`, size !== 'md' && `btn--${size}`, block && 'btn--block', iconOnly && 'btn--icon', extra);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonStyle {
  loading?: boolean;
  children?: ReactNode;
}

export function Button({ variant, size, block, iconOnly, loading, disabled, className, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, block, iconOnly }, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className="spinner" aria-hidden />}
      {/* An icon-only button swaps its icon for the spinner; a text button keeps its label. */}
      {!(loading && iconOnly) && children}
    </button>
  );
}
