// Values shared by the API and the UI so both sides validate against one source.

export const CONNECTION_TYPES = [
  { id: 'mentor', label: 'Mentors', hint: 'People who can guide me', complement: 'mentee' },
  { id: 'mentee', label: 'Mentees', hint: 'People I can guide', complement: 'mentor' },
  { id: 'cofounder', label: 'Co-founders', hint: 'To start something with', complement: 'cofounder' },
  { id: 'collaborator', label: 'Collaborators', hint: 'To work alongside', complement: 'collaborator' },
  { id: 'project_partner', label: 'Project partners', hint: 'For a specific build', complement: 'project_partner' },
  { id: 'hiring', label: 'People who are hiring', hint: 'I am open to roles', complement: 'talent' },
  { id: 'talent', label: 'Talent to hire', hint: 'I am building a team', complement: 'hiring' },
  { id: 'investor', label: 'Investors', hint: 'I am raising', complement: 'founder' },
  { id: 'founder', label: 'Founders to back', hint: 'I invest or advise', complement: 'investor' },
  { id: 'peer', label: 'Peers in my field', hint: 'To swap notes with', complement: 'peer' },
] as const;

export type ConnectionTypeId = (typeof CONNECTION_TYPES)[number]['id'];

export const CONNECTION_TYPE_IDS = CONNECTION_TYPES.map((t) => t.id) as [ConnectionTypeId, ...ConnectionTypeId[]];

export function connectionType(id: ConnectionTypeId) {
  return CONNECTION_TYPES.find((t) => t.id === id)!;
}

export const PROJECT_TYPES = [
  'Open source',
  'Hardware',
  'Research',
  'Startup',
  'Product',
  'Design',
  'Academic',
  'Community',
  'Client work',
  'Side project',
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];

export const SORT_OPTIONS = [
  { id: 'relevance', label: 'Most relevant' },
  { id: 'shared_skills', label: 'Most shared skills' },
  { id: 'shared_interests', label: 'Most shared interests' },
  { id: 'newest', label: 'Newest members' },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]['id'];

export const SEARCH_SCOPES = [
  { id: 'all', label: 'Everything' },
  { id: 'name', label: 'Name' },
  { id: 'profession', label: 'Profession' },
  { id: 'skill', label: 'Skill' },
  { id: 'interest', label: 'Interest' },
  { id: 'workplace', label: 'Workplace' },
  { id: 'project', label: 'Project' },
] as const;

export type SearchScope = (typeof SEARCH_SCOPES)[number]['id'];

/**
 * The version of the API the pages in this build expect. The server reports the version it is
 * running, and the app compares the two when it starts. Raise it whenever a change to the API
 * would make an older server answer the current pages wrongly.
 */
export const API_VERSION = 6;

export const LIMITS = {
  name: 80,
  shortText: 80,
  about: 1000,
  aspirations: 600,
  tag: 40,
  skills: 15,
  interests: 12,
  goals: 6,
  headline: 160,
  projects: 6,
  experience: 12,
  education: 6,
  certifications: 10,
  projectTitle: 90,
  projectDescription: 400,
  projectSkills: 6,
  passwordMin: 8,
  passwordMax: 128,
  /** Largest image the server stores (after the browser has cropped and compressed it). */
  photoBytes: 2 * 1024 * 1024,
  /** Largest original file a member may pick before it is cropped. */
  photoSourceBytes: 12 * 1024 * 1024,
  /** Largest LinkedIn PDF or data-export archive accepted for import. */
  importFileBytes: 15 * 1024 * 1024,
} as const;

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

const LINKEDIN_PROFILE_URL = /^https?:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/([A-Za-z0-9\-_%]{3,100})\/?(\?.*)?$/i;

/** Returns the profile slug when the URL is a LinkedIn member profile link, otherwise null. */
export function parseLinkedInUrl(url: string): string | null {
  const match = LINKEDIN_PROFILE_URL.exec(url.trim());
  return match ? match[2] : null;
}
