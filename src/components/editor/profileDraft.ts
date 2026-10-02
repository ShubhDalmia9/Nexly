import type { Certification, Education, Experience, Profile, ProfileInput, Project } from '../../../shared/types';

export type FieldErrors = Record<string, string>;

export interface SectionProps {
  draft: ProfileInput;
  /** Merges a partial update into the draft. */
  update: (patch: Partial<ProfileInput>) => void;
  errors: FieldErrors;
}

export function profileToInput(profile: Profile): ProfileInput {
  return {
    fullName: profile.fullName,
    headline: profile.headline,
    profession: profile.profession,
    workplace: profile.workplace,
    specialisation: profile.specialisation,
    location: profile.location,
    about: profile.about,
    aspirations: profile.aspirations,
    linkedinUrl: profile.linkedinUrl,
    skills: profile.skills,
    interests: profile.interests,
    goals: profile.goals,
    lookingFor: profile.lookingFor,
    projects: profile.projects,
    experience: profile.experience,
    education: profile.education,
    certifications: profile.certifications,
  };
}

export function emptyProject(): Project {
  return { title: '', description: '', type: 'Side project', role: '', year: new Date().getFullYear(), url: '', skills: [], imageUrl: null };
}

export const emptyExperience = (): Experience => ({ title: '', company: '', location: '', startDate: '', endDate: '', description: '' });
export const emptyEducation = (): Education => ({ school: '', degree: '', field: '', startYear: null, endYear: null });
export const emptyCertification = (): Certification => ({ name: '', issuer: '', year: null });

/** Drops cards the member added but left completely empty, in every list on the form. */
export function withoutBlankEntries(input: ProfileInput): ProfileInput {
  return {
    ...input,
    projects: input.projects.filter((project) => project.title.trim() || project.description.trim() || project.skills.length > 0 || project.imageUrl),
    experience: input.experience.filter((role) => role.title.trim() || role.company.trim() || role.description.trim()),
    education: input.education.filter((item) => item.school.trim() || item.degree.trim() || item.field.trim()),
    certifications: input.certifications.filter((item) => item.name.trim() || item.issuer.trim()),
  };
}

/**
 * Lays an import over a profile. In "fill" mode it only fills what is empty, so nothing the member
 * has written is lost; in "replace" mode every imported field wins.
 */
export function mergeImport(current: ProfileInput, imported: Partial<ProfileInput>, mode: 'fill' | 'replace'): ProfileInput {
  const next: ProfileInput = { ...current };
  for (const key of Object.keys(imported) as (keyof ProfileInput)[]) {
    const value = imported[key];
    if (value === undefined) continue;
    const existing = current[key];
    const isEmpty = Array.isArray(existing) ? existing.length === 0 : !existing;
    if (mode === 'replace' || isEmpty) (next as Record<keyof ProfileInput, unknown>)[key] = value;
  }
  return next;
}
