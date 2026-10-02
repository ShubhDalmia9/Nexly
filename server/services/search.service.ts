import type { SearchScope } from '../../shared/constants';
import type { Profile, SearchResponse, SearchResult } from '../../shared/types';
import { normalise } from '../lib/taxonomy';
import { buildPeople } from './people.service';
import { loadProfiles } from './profile.service';

interface Field {
  scope: Exclude<SearchScope, 'all'>;
  label: string;
  value: string;
  weight: number;
}

function searchableFields(profile: Profile): Field[] {
  const fields: Field[] = [
    { scope: 'name', label: 'Name', value: profile.fullName, weight: 6 },
    { scope: 'profession', label: 'Profession', value: profile.profession, weight: 5 },
    { scope: 'profession', label: 'Headline', value: profile.headline, weight: 3 },
    { scope: 'profession', label: 'Specialisation', value: profile.specialisation, weight: 4 },
    { scope: 'workplace', label: 'Workplace', value: profile.workplace, weight: 4 },
  ];
  for (const skill of profile.skills) fields.push({ scope: 'skill', label: 'Skill', value: skill, weight: 5 });
  for (const interest of profile.interests) fields.push({ scope: 'interest', label: 'Interest', value: interest, weight: 4 });
  for (const role of profile.experience) {
    fields.push({ scope: 'profession', label: 'Experience', value: role.title, weight: 3 });
    fields.push({ scope: 'workplace', label: 'Past workplace', value: role.company, weight: 3 });
  }
  for (const school of profile.education) {
    fields.push({ scope: 'workplace', label: 'Education', value: `${school.school} ${school.field}`, weight: 2 });
  }
  for (const project of profile.projects) {
    fields.push({ scope: 'project', label: 'Project', value: project.title, weight: 4 });
    fields.push({ scope: 'project', label: 'Project', value: `${project.description} ${project.skills.join(' ')}`, weight: 2 });
  }
  return fields;
}

/**
 * Every word of the query must appear somewhere in the profile (within the
 * chosen scope). Results rank by where the words were found, then by relevance
 * to the viewer.
 */
export function searchPeople(viewerId: number, query: string, scope: SearchScope): SearchResponse {
  const tokens = normalise(query).split(' ').filter(Boolean).slice(0, 8);
  if (tokens.length === 0) return { query, scope, results: [] };

  const hits: { profile: Profile; textScore: number; foundIn: string[] }[] = [];
  for (const profile of loadProfiles({ onlyDiscoverable: true }).values()) {
    if (profile.userId === viewerId) continue;
    const fields = searchableFields(profile)
      .filter((field) => scope === 'all' || field.scope === scope)
      .map((field) => ({ ...field, text: normalise(field.value) }));

    let textScore = 0;
    const foundIn = new Set<string>();
    const everyTokenFound = tokens.every((token) => {
      const matching = fields.filter((field) => field.text.includes(token));
      if (matching.length === 0) return false;
      const best = matching.reduce((a, b) => (b.weight > a.weight ? b : a));
      // Whole-word and prefix matches count for more than a match inside a word.
      const startsWord = new RegExp(`(^|[^a-z0-9])${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(best.text);
      textScore += best.weight * (startsWord ? 1.5 : 1);
      if (best.scope === 'skill' || best.scope === 'interest') foundIn.add(`${best.label}: ${best.value}`);
      else if (best.scope === 'project' && best.weight === 2) foundIn.add('Project details');
      else foundIn.add(best.scope === 'project' ? `Project: ${best.value}` : best.label);
      return true;
    });
    if (everyTokenFound) hits.push({ profile, textScore, foundIn: [...foundIn] });
  }

  const people = buildPeople(
    viewerId,
    hits.map((hit) => hit.profile),
  );
  const results: SearchResult[] = people
    .map((person, index) => ({ ...person, foundIn: hits[index].foundIn, textScore: hits[index].textScore }))
    .sort((a, b) => b.textScore - a.textScore || b.relevance.score - a.relevance.score)
    .slice(0, 40)
    .map(({ textScore: _textScore, ...result }) => result);

  return { query, scope, results };
}
