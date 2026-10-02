import { LIMITS } from '../../shared/constants';

/** The requirements the server enforces, shown as a live checklist. */
export const PASSWORD_RULES = [
  { label: `At least ${LIMITS.passwordMin} characters`, test: (value: string) => value.length >= LIMITS.passwordMin },
  { label: 'A letter', test: (value: string) => /[A-Za-z]/.test(value) },
  { label: 'A number', test: (value: string) => /[0-9]/.test(value) },
];

export const meetsPasswordRules = (password: string) => PASSWORD_RULES.every((rule) => rule.test(password));

const COMMON = ['password', '12345678', 'qwerty', 'letmein', 'welcome', 'iloveyou', 'abc123', 'admin', '11111111'];

export interface PasswordStrength {
  /** 0 (nothing typed) to 4 (strong). */
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
}

/**
 * A quick estimate of how hard a password is to guess: length counts most, then variety of
 * character types. Common passwords and simple repeats are capped at "Weak".
 */
export function passwordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: '' };
  const lower = password.toLowerCase();
  const variety = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(password)).length;
  let points = 0;
  if (password.length >= LIMITS.passwordMin) points += 1;
  if (password.length >= 12) points += 1;
  if (password.length >= 16) points += 1;
  if (variety >= 3) points += 1;
  if (variety === 4) points += 1;
  const predictable = COMMON.some((word) => lower.includes(word)) || /^(.)\1+$/.test(password) || new Set(password).size <= 4;
  if (predictable || !meetsPasswordRules(password)) points = Math.min(points, 1);

  const score = Math.max(1, Math.min(4, points)) as 1 | 2 | 3 | 4;
  return { score, label: ['', 'Weak', 'Fair', 'Good', 'Strong'][score] };
}
