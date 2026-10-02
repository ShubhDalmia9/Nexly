import { CONNECTION_TYPES, type ConnectionTypeId } from '../../shared/constants';
import type { Relevance, RelevanceReason, RelevanceTier, Profile } from '../../shared/types';
import {
  type DomainVector,
  addToVector,
  domainLabel,
  fieldSimilarity,
  normalise,
  primaryDomain,
  termDomains,
  textDomains,
  topDomains,
} from '../lib/taxonomy';

/**
 * Relevance scoring.
 *
 * Each candidate earns points from seven signals. The caps keep any single
 * signal from dominating and add up to 100:
 *
 *   shared skills ............ 30   (7.5 per skill, up to 4)
 *   shared interests ......... 18   (6 per interest, up to 3)
 *   related field ............ 14   (similarity of the two profiles' fields)
 *   complementary intent ..... 12   (e.g. you want a mentor, they want mentees)
 *   complementary skills ......  9   (skills you lack in the fields you care about)
 *   relevant projects ........  9   (projects built with your skills / interests)
 *   shared career goals ......  8
 *
 * Work history and education feed these signals too: past job titles, the headline, fields of
 * study and certifications all count towards "related field", so a profile imported from
 * LinkedIn is matched on its whole background rather than on the current job alone.
 *
 * Small bonuses apply for a shared specialisation, workplace, past employer or school, and for
 * people who have already asked to connect. The raw total is then passed through a
 * saturating curve so the 0–100 score reads naturally; the curve is monotonic,
 * so it never changes the ranking.
 */
const WEIGHTS = {
  skill: 7.5,
  skillCap: 4,
  interest: 6,
  interestCap: 3,
  field: 14,
  intentFirst: 8,
  intentCap: 12,
  complementary: 3,
  complementaryCap: 3,
  project: 4.5,
  projectCap: 2,
  goal: 4,
  goalCap: 2,
  specialisation: 3,
  workplace: 2,
  employer: 4,
  school: 3,
  incoming: 8,
};

const INTENT_REASONS: Record<ConnectionTypeId, string> = {
  mentor: 'Open to mentoring',
  mentee: 'Looking for a mentor',
  cofounder: 'Also looking for a co-founder',
  collaborator: 'Open to collaborating',
  project_partner: 'Looking for a project partner',
  hiring: 'Building a team',
  talent: 'Open to new roles',
  investor: 'Backs founders',
  founder: 'Raising for a startup',
  peer: 'Wants to meet peers in your field',
};

const INTENT_DETAILS: Record<ConnectionTypeId, string> = {
  mentor: 'You are looking for a mentor',
  mentee: 'You are open to mentoring',
  cofounder: 'You are both looking for a co-founder',
  collaborator: 'You are both open to collaborating',
  project_partner: 'You are both looking for project partners',
  hiring: 'You are open to roles',
  talent: 'You are building a team',
  investor: 'You are looking for investors',
  founder: 'You want to back founders',
  peer: 'You both want to meet peers',
};

interface Features {
  profile: Profile;
  skills: Map<string, string>;
  interests: Map<string, string>;
  goals: Map<string, string>;
  lookingFor: Set<ConnectionTypeId>;
  /** Every organisation worked at, past or present. */
  employers: Map<string, string>;
  schools: Map<string, string>;
  vector: DomainVector;
  /** The fields this person's interests point to, used to find complementary skills. */
  focusDomains: Set<string>;
}

const keyed = (values: string[]) => new Map(values.map((value) => [normalise(value), value]));

export function extractFeatures(profile: Profile): Features {
  const vector: DomainVector = new Map();
  for (const skill of profile.skills) addToVector(vector, termDomains(skill), 1);
  for (const interest of profile.interests) addToVector(vector, termDomains(interest), 1);
  addToVector(vector, textDomains(`${profile.profession} ${profile.specialisation}`), 2);
  for (const project of profile.projects) {
    for (const skill of project.skills) addToVector(vector, termDomains(skill), 0.4);
  }
  // Background: the headline, past roles, what was studied and certifications held. Recent roles
  // count for more than early ones.
  addToVector(vector, textDomains(profile.headline), 1);
  profile.experience.slice(0, 5).forEach((role, index) => {
    addToVector(vector, textDomains(`${role.title} ${role.description}`), index === 0 ? 1 : 0.6);
  });
  for (const school of profile.education) addToVector(vector, textDomains(`${school.field} ${school.degree}`), 0.6);
  for (const certification of profile.certifications) addToVector(vector, textDomains(certification.name), 0.4);

  const interestVector: DomainVector = new Map();
  for (const interest of profile.interests) addToVector(interestVector, termDomains(interest), 1);
  const focus = topDomains(interestVector, 2);
  const primary = primaryDomain(vector);
  if (primary) focus.push(primary);

  return {
    profile,
    skills: keyed(profile.skills),
    interests: keyed(profile.interests),
    goals: keyed(profile.goals),
    lookingFor: new Set(profile.lookingFor),
    employers: keyed([profile.workplace, ...profile.experience.map((role) => role.company)].filter(Boolean)),
    schools: keyed(profile.education.map((school) => school.school).filter(Boolean)),
    vector,
    focusDomains: new Set(focus),
  };
}

function shared(a: Map<string, string>, b: Map<string, string>): string[] {
  const result: string[] = [];
  for (const [key, label] of b) if (a.has(key)) result.push(label);
  return result;
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

function containsTerm(text: string, term: string): boolean {
  const index = text.indexOf(term);
  if (index < 0 || term.length < 3) return false;
  const before = text[index - 1];
  const after = text[index + term.length];
  const boundary = (ch: string | undefined) => ch === undefined || !/[a-z0-9]/.test(ch);
  return boundary(before) && boundary(after);
}

function tierFor(score: number): RelevanceTier {
  if (score >= 72) return 'high';
  if (score >= 50) return 'good';
  if (score >= 25) return 'possible';
  return 'low';
}

export function scoreRelevance(viewer: Features, candidate: Features, context: { incomingRequest?: boolean } = {}): Relevance {
  const reasons: RelevanceReason[] = [];
  let raw = 0;

  if (context.incomingRequest) {
    raw += WEIGHTS.incoming;
    reasons.push({ kind: 'incoming', label: 'Wants to connect with you', detail: 'They have already sent you a request' });
  }

  // 1. Shared skills
  const sharedSkills = shared(viewer.skills, candidate.skills);
  raw += Math.min(sharedSkills.length, WEIGHTS.skillCap) * WEIGHTS.skill;
  if (sharedSkills.length > 0) {
    reasons.push({ kind: 'skills', label: plural(sharedSkills.length, 'shared skill'), detail: sharedSkills.join(', ') });
  }

  // 2. Shared interests
  const sharedInterests = shared(viewer.interests, candidate.interests);
  raw += Math.min(sharedInterests.length, WEIGHTS.interestCap) * WEIGHTS.interest;
  if (sharedInterests.length > 0) {
    reasons.push({
      kind: 'interests',
      label: plural(sharedInterests.length, 'shared interest'),
      detail: sharedInterests.join(', '),
    });
  }

  // 3. Complementary skills: things they know that you don't, inside the fields you care about.
  //    A skill that is literally one of your interests ranks first.
  const direct: string[] = [];
  const adjacent: string[] = [];
  for (const [key, label] of candidate.skills) {
    if (viewer.skills.has(key)) continue;
    if (viewer.interests.has(key)) direct.push(label);
    else if (termDomains(label).some((domain) => viewer.focusDomains.has(domain))) adjacent.push(label);
  }
  const complementarySkills = [...direct, ...adjacent];
  raw += Math.min(complementarySkills.length, WEIGHTS.complementaryCap) * WEIGHTS.complementary;
  if (complementarySkills.length > 0) {
    reasons.push({
      kind: 'complementary',
      label: 'Complementary skills',
      detail: complementarySkills.slice(0, 3).join(', '),
    });
  }

  // 4. Complementary intent: each side is looking for what the other offers.
  const similarity = fieldSimilarity(viewer.vector, candidate.vector);
  const intents = CONNECTION_TYPES.filter(
    (type) =>
      viewer.lookingFor.has(type.id) &&
      candidate.lookingFor.has(type.complement) &&
      (type.id !== 'peer' || similarity >= 0.5),
  );
  if (intents.length > 0) {
    raw += Math.min(WEIGHTS.intentFirst + (intents.length - 1) * 4, WEIGHTS.intentCap);
    const first = intents[0].id;
    reasons.push({ kind: 'intent', label: INTENT_REASONS[first], detail: INTENT_DETAILS[first] });
  }

  // 5. Relevant projects: built with your skills, or about something you follow.
  const viewerTerms = new Set([...viewer.skills.keys(), ...viewer.interests.keys()]);
  const relevantProjects: string[] = [];
  for (const project of candidate.profile.projects) {
    const projectSkills = project.skills.map(normalise);
    const text = normalise(`${project.title} ${project.description}`);
    const directHit = projectSkills.some((skill) => viewerTerms.has(skill));
    const topicHit = [...viewer.interests.keys()].some((interest) => containsTerm(text, interest));
    const fieldHits = project.skills.filter((skill) =>
      termDomains(skill).some((domain) => viewer.focusDomains.has(domain)),
    ).length;
    if (directHit || topicHit || fieldHits >= 2) relevantProjects.push(project.title);
  }
  raw += Math.min(relevantProjects.length, WEIGHTS.projectCap) * WEIGHTS.project;
  if (relevantProjects.length > 0) {
    reasons.push({ kind: 'project', label: 'Relevant project experience', detail: relevantProjects.slice(0, 2).join(' · ') });
  }

  // 6. Related field
  const fieldPoints = Math.max(0, Math.min(1, (similarity - 0.3) / 0.6)) * WEIGHTS.field;
  raw += fieldPoints;
  if (similarity >= 0.55) {
    const viewerField = primaryDomain(viewer.vector);
    const candidateField = primaryDomain(candidate.vector);
    if (candidateField) {
      reasons.push({
        kind: 'field',
        label: viewerField === candidateField ? 'Works in your field' : 'Works in a related field',
        detail: domainLabel(candidateField),
      });
    }
  }

  // 7. Shared career goals
  const sharedGoals = shared(viewer.goals, candidate.goals);
  raw += Math.min(sharedGoals.length, WEIGHTS.goalCap) * WEIGHTS.goal;
  if (sharedGoals.length > 0) {
    reasons.push({ kind: 'goals', label: plural(sharedGoals.length, 'shared goal'), detail: sharedGoals.join(', ') });
  }

  // Bonuses
  const sameSpecialisation =
    viewer.profile.specialisation && normalise(viewer.profile.specialisation) === normalise(candidate.profile.specialisation);
  if (sameSpecialisation) {
    raw += WEIGHTS.specialisation;
    reasons.push({ kind: 'specialisation', label: 'Same specialisation', detail: candidate.profile.specialisation });
  }
  const sameWorkplace =
    viewer.profile.workplace && normalise(viewer.profile.workplace) === normalise(candidate.profile.workplace);
  if (sameWorkplace) {
    raw += WEIGHTS.workplace;
    reasons.push({ kind: 'workplace', label: 'Same workplace', detail: candidate.profile.workplace });
  }
  // A shared employer at any point in either career (other than the current shared workplace above).
  const sharedEmployers = shared(viewer.employers, candidate.employers).filter(
    (employer) => !sameWorkplace || normalise(employer) !== normalise(candidate.profile.workplace),
  );
  if (sharedEmployers.length > 0) {
    raw += WEIGHTS.employer;
    reasons.push({ kind: 'employer', label: 'Worked at the same company', detail: sharedEmployers.join(', ') });
  }
  const sharedSchools = shared(viewer.schools, candidate.schools);
  if (sharedSchools.length > 0) {
    raw += WEIGHTS.school;
    reasons.push({ kind: 'school', label: 'Studied at the same place', detail: sharedSchools.join(', ') });
  }

  const score = Math.round(100 * (1 - Math.exp(-Math.min(raw, 100) / 36)));

  return {
    score,
    tier: tierFor(score),
    reasons,
    sharedSkills,
    sharedInterests,
    sharedGoals,
    complementarySkills,
    relevantProjects,
  };
}
