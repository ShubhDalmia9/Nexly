import { Check } from 'lucide-react';
import { LIMITS } from '../../../shared/constants';
import { cx } from '../../utils/format';
import { PASSWORD_RULES, passwordStrength } from '../../utils/password';
import { TextField } from '../ui/Field';

interface PasswordSetupProps {
  password: string;
  confirm: string;
  onPassword: (value: string) => void;
  onConfirm: (value: string) => void;
  errors: { password?: string; confirm?: string };
  label?: string;
}

/** Password and confirmation fields with a strength meter and the live requirements checklist. */
export function PasswordSetup({ password, confirm, onPassword, onConfirm, errors, label = 'Password' }: PasswordSetupProps) {
  const strength = passwordStrength(password);
  return (
    <>
      <div className="stack" style={{ gap: 8 }}>
        <TextField
          label={label}
          type="password"
          name="new-password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => onPassword(event.target.value)}
          error={errors.password}
          maxLength={LIMITS.passwordMax}
        />
        <div className="strength-meter" role="status" aria-live="polite">
          <div className={cx('strength-meter__bar', `strength-meter__bar--${strength.score}`)} aria-hidden>
            <span />
            <span />
            <span />
            <span />
          </div>
          <span className="strength-meter__label">{strength.label ? `Strength: ${strength.label}` : 'Strength'}</span>
        </div>
        <ul className="password-rules" aria-label="Password requirements">
          {PASSWORD_RULES.map((rule) => {
            const met = rule.test(password);
            return (
              <li key={rule.label} className={cx(met && 'is-met')}>
                <Check aria-hidden />
                {rule.label}
                <span className="sr-only">{met ? ' (met)' : ' (not met yet)'}</span>
              </li>
            );
          })}
        </ul>
      </div>
      <TextField
        label={`Confirm ${label.toLowerCase()}`}
        type="password"
        name="confirm-password"
        autoComplete="new-password"
        value={confirm}
        onChange={(event) => onConfirm(event.target.value)}
        error={errors.confirm}
        maxLength={LIMITS.passwordMax}
      />
    </>
  );
}
