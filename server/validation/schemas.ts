import { z } from 'zod';
import { CONNECTION_TYPE_IDS, LIMITS, PROJECT_TYPES, SEARCH_SCOPES, SORT_OPTIONS, parseLinkedInUrl } from '../../shared/constants';
import type { DiscoveryFilters } from '../../shared/types';
import { HttpError } from '../lib/errors';

/** Parses untrusted input and turns validation failures into a 400 with per-field messages. */
export function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || 'form';
    if (!fields[key]) fields[key] = issue.message;
  }
  throw new HttpError(400, 'VALIDATION_ERROR', Object.values(fields)[0] ?? 'Check the form and try again.', fields);
}

const email = z
  .string({ error: 'Enter your email address.' })
  .trim()
  .toLowerCase()
  .max(254, 'That email address is too long.')
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address.');

const password = z
  .string({ error: 'Enter a password.' })
  .min(LIMITS.passwordMin, `Use at least ${LIMITS.passwordMin} characters.`)
  .max(LIMITS.passwordMax, 'That password is too long.')
  .regex(/[A-Za-z]/, 'Include at least one letter.')
  .regex(/[0-9]/, 'Include at least one number.');

const text = (max: number, label: string) =>
  z.string().trim().max(max, `${label} must be ${max} characters or fewer.`);

const tag = z.string().trim().min(1).max(LIMITS.tag, `Tags must be ${LIMITS.tag} characters or fewer.`);

const fullName = z.string({ error: 'Enter your name.' }).trim().min(2, 'Enter your full name.').max(LIMITS.name, 'That name is too long.');
const linkToken = z.string({ error: 'This link is not valid.' }).min(20, 'This link is not valid.').max(200, 'This link is not valid.');

export const signupSchema = z.object({ fullName, email, password });

/** A password-reset link. */
export const tokenSchema = z.object({ token: linkToken });

export const logInSchema = z.object({
  email,
  password: z.string({ error: 'Enter your password.' }).min(1, 'Enter your password.').max(LIMITS.passwordMax),
});

/** Shared by the endpoints that take only an email address. */
export const emailOnlySchema = z.object({ email });

export const resetPasswordSchema = z.object({ token: linkToken, password });

export const changePasswordSchema = z.object({
  currentPassword: z.string({ error: 'Enter your current password.' }).min(1, 'Enter your current password.').max(LIMITS.passwordMax),
  newPassword: password,
});

export const deleteAccountSchema = z.object({
  password: z.string({ error: 'Enter your password to confirm.' }).min(1, 'Enter your password to confirm.').max(LIMITS.passwordMax),
});

export const settingsSchema = z.object({
  discoverable: z.boolean(),
  notifyRequests: z.boolean(),
  notifyAccepted: z.boolean(),
  emailRequests: z.boolean(),
  emailAccepted: z.boolean(),
});

export const nameSchema = z.object({ fullName });

const projectSchema = z.object({
  title: z.string().trim().min(1, 'Give the project a title.').max(LIMITS.projectTitle, 'That project title is too long.'),
  description: text(LIMITS.projectDescription, 'Project description').default(''),
  type: z.enum(PROJECT_TYPES).default('Side project'),
  role: text(LIMITS.shortText, 'Role').default(''),
  year: z.number().int().min(1970).max(2100).nullable().default(null),
  url: z
    .string()
    .trim()
    .max(200)
    .refine((value) => value === '' || /^https?:\/\/\S+$/i.test(value), 'Project links must start with http:// or https://')
    .default(''),
  skills: z.array(tag).max(LIMITS.projectSkills, `Add up to ${LIMITS.projectSkills} skills per project.`).default([]),
  // Only images uploaded through this app are accepted; ownership is checked when the profile is saved.
  imageUrl: z
    .string()
    .max(200)
    .regex(/^\/uploads\/[A-Za-z0-9._-]+$/, 'That project image is not valid.')
    .nullable()
    .default(null),
});

const partialDate = z
  .string()
  .trim()
  .regex(/^(\d{4}(-(0[1-9]|1[0-2]))?)?$/, 'Use a year, or a year and month.')
  .default('');
const year = z.number().int().min(1950, 'Enter a valid year.').max(2100, 'Enter a valid year.').nullable().default(null);

const experienceSchema = z
  .object({
    title: z.string().trim().min(1, 'Enter the role title.').max(100, 'That title is too long.'),
    company: text(100, 'Company').default(''),
    location: text(LIMITS.shortText, 'Location').default(''),
    startDate: partialDate,
    endDate: partialDate,
    description: text(600, 'Description').default(''),
  })
  .refine((item) => !item.startDate || !item.endDate || item.startDate.slice(0, 7) <= item.endDate.padEnd(7, '-12').slice(0, 7), {
    message: 'The end date is before the start date.',
    path: ['endDate'],
  });

const educationSchema = z
  .object({
    school: z.string().trim().min(1, 'Enter the school or university.').max(120, 'That name is too long.'),
    degree: text(100, 'Degree').default(''),
    field: text(100, 'Field of study').default(''),
    startYear: year,
    endYear: year,
  })
  .refine((item) => item.startYear === null || item.endYear === null || item.startYear <= item.endYear, {
    message: 'The end year is before the start year.',
    path: ['endYear'],
  });

const certificationSchema = z.object({
  name: z.string().trim().min(1, 'Enter the certification name.').max(120, 'That name is too long.'),
  issuer: text(100, 'Issuer').default(''),
  year,
});

export const profileSchema = z.object({
  fullName,
  headline: text(LIMITS.headline, 'Headline').default(''),
  profession: text(LIMITS.shortText, 'Profession'),
  workplace: text(LIMITS.shortText, 'Workplace'),
  specialisation: text(LIMITS.shortText, 'Specialisation'),
  location: text(LIMITS.shortText, 'Location'),
  about: text(LIMITS.about, 'About'),
  aspirations: text(LIMITS.aspirations, 'Career aspirations'),
  linkedinUrl: z
    .string()
    .trim()
    .max(200)
    .refine((value) => value === '' || parseLinkedInUrl(value) !== null, 'Enter a LinkedIn profile link, or leave this empty.'),
  skills: z.array(tag).max(LIMITS.skills, `Add up to ${LIMITS.skills} skills.`),
  interests: z.array(tag).max(LIMITS.interests, `Add up to ${LIMITS.interests} interests.`),
  goals: z.array(tag).max(LIMITS.goals, `Add up to ${LIMITS.goals} goals.`),
  lookingFor: z.array(z.enum(CONNECTION_TYPE_IDS)).max(CONNECTION_TYPE_IDS.length),
  projects: z.array(projectSchema).max(LIMITS.projects, `Add up to ${LIMITS.projects} projects.`),
  experience: z.array(experienceSchema).max(LIMITS.experience, `Add up to ${LIMITS.experience} roles.`).default([]),
  education: z.array(educationSchema).max(LIMITS.education, `Add up to ${LIMITS.education} schools.`).default([]),
  certifications: z.array(certificationSchema).max(LIMITS.certifications, `Add up to ${LIMITS.certifications} certifications.`).default([]),
  completeOnboarding: z.boolean().optional(),
});

/** A LinkedIn profile link. Everything except the profile slug is dropped. */
export const linkedInUrl = z
  .string({ error: 'Enter your LinkedIn profile link.' })
  .trim()
  .max(200, 'That link is too long.')
  .refine((value) => parseLinkedInUrl(value) !== null, 'That does not look like a LinkedIn profile link. It should look like https://www.linkedin.com/in/your-name');

const userId = z.number({ error: 'Choose a person.' }).int().positive();

export const decisionSchema = z.object({
  targetId: userId,
  action: z.enum(['connect', 'skip']),
});

export const connectSchema = z.object({ targetId: userId });

export const idParam = z.coerce.number().int().positive();

const list = (value: unknown, max: number): string[] =>
  typeof value === 'string'
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, max)
    : [];

const single = (value: unknown, max = 80): string => (typeof value === 'string' ? value.trim().slice(0, max) : '');

/** Reads discovery filters from a query string, ignoring anything unrecognised. */
export function parseDiscoveryFilters(query: Record<string, unknown>): DiscoveryFilters {
  const sort = single(query.sort);
  const lookingFor = single(query.lookingFor);
  const projectType = single(query.projectType);
  return {
    profession: single(query.profession),
    workplace: single(query.workplace),
    specialisation: single(query.specialisation),
    skills: list(query.skills, 8),
    interests: list(query.interests, 8),
    goals: list(query.goals, 6),
    projectType: (PROJECT_TYPES as readonly string[]).includes(projectType) ? projectType : '',
    lookingFor: CONNECTION_TYPE_IDS.find((id) => id === lookingFor) ?? '',
    sort: SORT_OPTIONS.find((option) => option.id === sort)?.id ?? 'relevance',
  };
}

export function parseSearchQuery(query: Record<string, unknown>) {
  const scope = single(query.scope);
  return {
    q: single(query.q, 100),
    scope: SEARCH_SCOPES.find((option) => option.id === scope)?.id ?? 'all',
  };
}
