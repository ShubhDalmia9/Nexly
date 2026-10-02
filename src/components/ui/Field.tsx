import { CircleAlert, Eye, EyeOff } from 'lucide-react';
import { type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes, useId, useState } from 'react';
import { cx } from '../../utils/format';

interface FieldShellProps {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  counter?: string;
  children: ReactNode;
}

/** Label, control, hint and error message, wired together for assistive technology. */
export function FieldShell({ id, label, hint, error, optional, counter, children }: FieldShellProps) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        <span>
          {label} {optional && <span className="field__optional">(optional)</span>}
        </span>
        {counter && <span className="char-count">{counter}</span>}
      </label>
      {children}
      {error ? (
        <p className="field__error" id={`${id}-error`} role="alert">
          <CircleAlert aria-hidden />
          {error}
        </p>
      ) : (
        hint && (
          <p className="field__hint" id={`${id}-hint`}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}

interface CommonProps {
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
}

function describedBy(id: string, hint: ReactNode, error?: string): string | undefined {
  if (error) return `${id}-error`;
  return hint ? `${id}-hint` : undefined;
}

type TextFieldProps = CommonProps & InputHTMLAttributes<HTMLInputElement>;

export function TextField({ label, hint, error, optional, className, type, ...rest }: TextFieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';

  const input = (
    <input
      id={id}
      className={cx('input', className)}
      type={isPassword && visible ? 'text' : type}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(id, hint, error)}
      {...rest}
    />
  );

  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional}>
      {isPassword ? (
        <div className="input-group">
          {input}
          <button
            type="button"
            className="input-group__action"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
          >
            {visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          </button>
        </div>
      ) : (
        input
      )}
    </FieldShell>
  );
}

type TextAreaFieldProps = CommonProps & TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string };

export function TextAreaField({ label, hint, error, optional, className, maxLength, value, ...rest }: TextAreaFieldProps) {
  const id = useId();
  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      optional={optional}
      counter={maxLength ? `${value.length}/${maxLength}` : undefined}
    >
      <textarea
        id={id}
        className={cx('textarea', className)}
        maxLength={maxLength}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...rest}
      />
    </FieldShell>
  );
}

type SelectFieldProps = CommonProps &
  SelectHTMLAttributes<HTMLSelectElement> & {
    options: readonly { value: string; label: string }[];
    placeholder?: string;
  };

export function SelectField({ label, hint, error, optional, className, options, placeholder, ...rest }: SelectFieldProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional}>
      <select id={id} className={cx('select', className)} aria-describedby={describedBy(id, hint, error)} {...rest}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}
