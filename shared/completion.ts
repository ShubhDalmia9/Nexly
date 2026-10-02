import type { Completion, CompletionItem, ProfileInput } from './types';

type CompletionSource = ProfileInput & { photoUrl: string | null };

/**
 * Profile completeness, used for the progress ring and the "suggested actions" list.
 * Weights add up to 100 and favour the fields the relevance ranking relies on most.
 */
export function computeCompletion(p: CompletionSource): Completion {
  const items: CompletionItem[] = [
    { key: 'photo', label: 'Profile photo', hint: 'Add a photo so people recognise you', weight: 10, done: Boolean(p.photoUrl) },
    { key: 'profession', label: 'Profession', hint: 'Say what you do', weight: 10, done: p.profession.trim().length > 0 },
    { key: 'workplace', label: 'Current work', hint: 'Add where you work or study', weight: 5, done: p.workplace.trim().length > 0 },
    { key: 'specialisation', label: 'Specialisation', hint: 'Name your area of focus', weight: 5, done: p.specialisation.trim().length > 0 },
    { key: 'about', label: 'About', hint: 'Write a short introduction', weight: 10, done: p.about.trim().length >= 40 },
    { key: 'skills', label: 'At least 3 skills', hint: 'Skills drive most of your recommendations', weight: 15, done: p.skills.length >= 3 },
    { key: 'interests', label: 'At least 2 interests', hint: 'Interests surface people outside your field', weight: 10, done: p.interests.length >= 2 },
    { key: 'goals', label: 'Career aspirations', hint: 'Share where you want to go next', weight: 10, done: p.aspirations.trim().length >= 20 || p.goals.length > 0 },
    { key: 'lookingFor', label: 'Who you want to meet', hint: 'Pick the kinds of people you are looking for', weight: 10, done: p.lookingFor.length > 0 },
    { key: 'projects', label: 'A project', hint: 'Show something you have built or worked on', weight: 10, done: p.projects.length > 0 },
    { key: 'background', label: 'Experience or education', hint: 'Add a role you have held or where you studied', weight: 5, done: p.experience.length > 0 || p.education.length > 0 },
  ];
  const percent = items.reduce((sum, item) => sum + (item.done ? item.weight : 0), 0);
  return { percent, items };
}

/** The minimum a profile needs before it can appear in discovery. */
export function onboardingBlockers(p: ProfileInput): string[] {
  const blockers: string[] = [];
  if (p.fullName.trim().length < 2) blockers.push('your name');
  if (!p.profession.trim()) blockers.push('your profession');
  if (p.skills.length === 0) blockers.push('at least one skill');
  return blockers;
}
