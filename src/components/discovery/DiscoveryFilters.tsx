import { useId } from 'react';
import { CONNECTION_TYPES, type ConnectionTypeId, PROJECT_TYPES, SORT_OPTIONS, type SortOption } from '../../../shared/constants';
import type { DiscoveryFilters as Filters, Meta } from '../../../shared/types';
import { SelectField, TextField } from '../ui/Field';
import { TagInput } from '../ui/TagInput';

export const EMPTY_FILTERS: Filters = {
  profession: '',
  workplace: '',
  specialisation: '',
  skills: [],
  interests: [],
  goals: [],
  projectType: '',
  lookingFor: '',
  sort: 'relevance',
};

/** How many filters are narrowing the deck (sorting does not count). */
export function activeFilterCount(filters: Filters): number {
  return (
    [filters.profession, filters.workplace, filters.specialisation, filters.projectType, filters.lookingFor].filter(Boolean).length +
    filters.skills.length +
    filters.interests.length +
    filters.goals.length
  );
}

interface DiscoveryFiltersProps {
  filters: Filters;
  onChange: (next: Filters) => void;
  meta: Meta;
}

const toOptions = (values: readonly string[]) => values.map((value) => ({ value, label: value }));

export function DiscoveryFilters({ filters, onChange, meta }: DiscoveryFiltersProps) {
  const workplaceListId = useId();
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => onChange({ ...filters, [key]: value });

  return (
    <form className="filters" onSubmit={(event) => event.preventDefault()} aria-label="Discovery filters">
      <SelectField
        label="Sort by"
        value={filters.sort}
        onChange={(event) => set('sort', event.target.value as SortOption)}
        options={SORT_OPTIONS.map((option) => ({ value: option.id, label: option.label }))}
      />
      <SelectField
        label="I'm looking for"
        value={filters.lookingFor}
        onChange={(event) => set('lookingFor', event.target.value as ConnectionTypeId | '')}
        placeholder="Anyone"
        options={CONNECTION_TYPES.map((type) => ({ value: type.id, label: type.label }))}
        hint={filters.lookingFor ? 'Shows people who are looking for someone like you in return.' : undefined}
      />
      <SelectField
        label="Profession"
        value={filters.profession}
        onChange={(event) => set('profession', event.target.value)}
        placeholder="Any profession"
        options={toOptions(meta.professions)}
      />
      <TagInput
        label="Skills"
        value={filters.skills}
        onChange={(skills) => set('skills', skills)}
        suggestions={meta.skills}
        max={5}
        placeholder="e.g. Python, CAD"
        hint={filters.skills.length > 1 ? 'People must have all of these.' : undefined}
        allowCustom={false}
      />
      <TagInput
        label="Interests"
        value={filters.interests}
        onChange={(interests) => set('interests', interests)}
        suggestions={meta.interests}
        max={5}
        placeholder="e.g. Robotics"
        allowCustom={false}
      />
      <SelectField
        label="Specialisation"
        value={filters.specialisation}
        onChange={(event) => set('specialisation', event.target.value)}
        placeholder="Any specialisation"
        options={toOptions(meta.specialisations)}
      />
      <TextField
        label="Workplace"
        value={filters.workplace}
        onChange={(event) => set('workplace', event.target.value)}
        placeholder="Company or institution"
        list={workplaceListId}
        autoComplete="off"
      />
      <datalist id={workplaceListId}>
        {meta.workplaces.map((workplace) => (
          <option key={workplace} value={workplace} />
        ))}
      </datalist>
      <TagInput
        label="Career goals"
        value={filters.goals}
        onChange={(goals) => set('goals', goals)}
        suggestions={meta.goals}
        max={3}
        placeholder="e.g. Launch a startup"
        allowCustom={false}
      />
      <SelectField
        label="Project type"
        value={filters.projectType}
        onChange={(event) => set('projectType', event.target.value)}
        placeholder="Any project type"
        options={toOptions(PROJECT_TYPES)}
      />
    </form>
  );
}
