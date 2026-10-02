import type { ConnectionTypeId } from '../../shared/constants';
import { LIMITS } from '../../shared/constants';
import { onboardingBlockers } from '../../shared/completion';
import type { Certification, Education, Experience, Meta, Profile, ProfileInput, Project } from '../../shared/types';
import { all, get, nowIso, run, transaction } from '../db/connection';
import { badRequest, notFound } from '../lib/errors';
import { normalise } from '../lib/taxonomy';
import { assertOwnsProjectImages, removeUnusedProjectImages } from './image.service';

interface ProfileRow {
  user_id: number;
  full_name: string;
  headline: string;
  profession: string;
  workplace: string;
  specialisation: string;
  location: string;
  about: string;
  aspirations: string;
  photo_url: string | null;
  linkedin_url: string;
  onboarded: number;
  updated_at: string;
  joined_at: string;
}

// `?1` is either NULL (no restriction) or a JSON array of user ids.
const ID_FILTER = '(?1 IS NULL OR user_id IN (SELECT value FROM json_each(?1)))';

type TagTable = 'skills' | 'interests' | 'goals';
const TAG_JOIN: Record<TagTable, { link: string; column: string }> = {
  skills: { link: 'profile_skills', column: 'skill_id' },
  interests: { link: 'profile_interests', column: 'interest_id' },
  goals: { link: 'profile_goals', column: 'goal_id' },
};

function loadTags(table: TagTable, idsJson: string | null): Map<number, string[]> {
  const { link, column } = TAG_JOIN[table];
  const rows = all<{ user_id: number; name: string }>(
    `SELECT l.user_id, t.name FROM ${link} l JOIN ${table} t ON t.id = l.${column}
     WHERE ${ID_FILTER.replaceAll('user_id', 'l.user_id')} ORDER BY l.user_id, l.position`,
    idsJson,
  );
  const byUser = new Map<number, string[]>();
  for (const row of rows) {
    const list = byUser.get(row.user_id);
    if (list) list.push(row.name);
    else byUser.set(row.user_id, [row.name]);
  }
  return byUser;
}

/** Loads complete profiles in a fixed number of queries, however many users are requested. */
export function loadProfiles(
  options: {
    ids?: number[];
    onlyOnboarded?: boolean;
    /** Leave out members who have switched their profile visibility off. Implies onboarded. */
    onlyDiscoverable?: boolean;
  } = {},
): Map<number, Profile> {
  const idsJson = options.ids ? JSON.stringify(options.ids) : null;
  const rows = all<ProfileRow>(
    `SELECT p.*, u.created_at AS joined_at FROM profiles p JOIN users u ON u.id = p.user_id
     WHERE ${ID_FILTER.replaceAll('user_id', 'p.user_id')} AND (?2 = 0 OR p.onboarded = 1)
       AND (?3 = 0 OR EXISTS (SELECT 1 FROM user_settings s WHERE s.user_id = p.user_id AND s.discoverable = 1))`,
    idsJson,
    options.onlyOnboarded || options.onlyDiscoverable ? 1 : 0,
    options.onlyDiscoverable ? 1 : 0,
  );

  const skills = loadTags('skills', idsJson);
  const interests = loadTags('interests', idsJson);
  const goals = loadTags('goals', idsJson);

  const lookingFor = new Map<number, ConnectionTypeId[]>();
  for (const row of all<{ user_id: number; type: ConnectionTypeId }>(
    `SELECT user_id, type FROM profile_looking_for WHERE ${ID_FILTER}`,
    idsJson,
  )) {
    lookingFor.set(row.user_id, [...(lookingFor.get(row.user_id) ?? []), row.type]);
  }

  const projects = new Map<number, Project[]>();
  const projectsById = new Map<number, Project>();
  for (const row of all<{
    id: number;
    user_id: number;
    title: string;
    description: string;
    type: string;
    role: string;
    year: number | null;
    url: string;
    image_url: string | null;
  }>(`SELECT * FROM projects WHERE ${ID_FILTER} ORDER BY user_id, position`, idsJson)) {
    const project: Project = {
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type,
      role: row.role,
      year: row.year,
      url: row.url,
      skills: [],
      imageUrl: row.image_url,
    };
    projectsById.set(row.id, project);
    projects.set(row.user_id, [...(projects.get(row.user_id) ?? []), project]);
  }
  for (const row of all<{ project_id: number; name: string }>(
    `SELECT ps.project_id, s.name FROM project_skills ps
     JOIN skills s ON s.id = ps.skill_id
     JOIN projects p ON p.id = ps.project_id
     WHERE ${ID_FILTER.replaceAll('user_id', 'p.user_id')} ORDER BY ps.rowid`,
    idsJson,
  )) {
    projectsById.get(row.project_id)?.skills.push(row.name);
  }

  const experience = groupByUser(
    all<{ id: number; user_id: number; title: string; company: string; location: string; start_date: string | null; end_date: string | null; description: string }>(
      `SELECT * FROM experiences WHERE ${ID_FILTER} ORDER BY user_id, position`,
      idsJson,
    ),
    (row): Experience => ({
      id: row.id,
      title: row.title,
      company: row.company,
      location: row.location,
      startDate: row.start_date ?? '',
      endDate: row.end_date ?? '',
      description: row.description,
    }),
  );
  const education = groupByUser(
    all<{ id: number; user_id: number; school: string; degree: string; field: string; start_year: number | null; end_year: number | null }>(
      `SELECT * FROM education WHERE ${ID_FILTER} ORDER BY user_id, position`,
      idsJson,
    ),
    (row): Education => ({ id: row.id, school: row.school, degree: row.degree, field: row.field, startYear: row.start_year, endYear: row.end_year }),
  );
  const certifications = groupByUser(
    all<{ id: number; user_id: number; name: string; issuer: string; year: number | null }>(
      `SELECT * FROM certifications WHERE ${ID_FILTER} ORDER BY user_id, position`,
      idsJson,
    ),
    (row): Certification => ({ id: row.id, name: row.name, issuer: row.issuer, year: row.year }),
  );

  const result = new Map<number, Profile>();
  for (const row of rows) {
    result.set(row.user_id, {
      userId: row.user_id,
      fullName: row.full_name,
      headline: row.headline,
      profession: row.profession,
      workplace: row.workplace,
      specialisation: row.specialisation,
      location: row.location,
      about: row.about,
      aspirations: row.aspirations,
      photoUrl: row.photo_url,
      linkedinUrl: row.linkedin_url,
      onboarded: row.onboarded === 1,
      joinedAt: row.joined_at,
      updatedAt: row.updated_at,
      skills: skills.get(row.user_id) ?? [],
      interests: interests.get(row.user_id) ?? [],
      goals: goals.get(row.user_id) ?? [],
      lookingFor: lookingFor.get(row.user_id) ?? [],
      projects: projects.get(row.user_id) ?? [],
      experience: experience.get(row.user_id) ?? [],
      education: education.get(row.user_id) ?? [],
      certifications: certifications.get(row.user_id) ?? [],
    });
  }
  return result;
}

function groupByUser<Row extends { user_id: number }, Item>(rows: Row[], toItem: (row: Row) => Item): Map<number, Item[]> {
  const grouped = new Map<number, Item[]>();
  for (const row of rows) {
    const list = grouped.get(row.user_id);
    if (list) list.push(toItem(row));
    else grouped.set(row.user_id, [toItem(row)]);
  }
  return grouped;
}

export function getProfile(userId: number): Profile {
  const profile = loadProfiles({ ids: [userId] }).get(userId);
  if (!profile) throw notFound('That profile does not exist.');
  return profile;
}

/** Trims, collapses whitespace and removes case-insensitive duplicates while keeping the order. */
export function cleanTags(tags: string[], max: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim().replace(/\s+/g, ' ').slice(0, LIMITS.tag);
    const key = normalise(tag);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
    if (result.length === max) break;
  }
  return result;
}

function tagId(table: TagTable, name: string): number {
  run(`INSERT INTO ${table} (name) VALUES (?) ON CONFLICT(name) DO NOTHING`, name);
  return get<{ id: number }>(`SELECT id FROM ${table} WHERE name = ?`, name)!.id;
}

function replaceTags(table: TagTable, userId: number, tags: string[]): void {
  const { link, column } = TAG_JOIN[table];
  run(`DELETE FROM ${link} WHERE user_id = ?`, userId);
  tags.forEach((tag, position) => {
    run(`INSERT OR IGNORE INTO ${link} (user_id, ${column}, position) VALUES (?, ?, ?)`, userId, tagId(table, tag), position);
  });
}

/**
 * Replaces the caller's own profile. `userId` always comes from the session,
 * never from the request body, so one user cannot edit another's profile.
 */
export async function saveProfile(
  userId: number,
  input: ProfileInput,
  options: { completeOnboarding?: boolean } = {},
): Promise<Profile> {
  const current = getProfile(userId);
  const cleaned: ProfileInput = {
    ...input,
    skills: cleanTags(input.skills, LIMITS.skills),
    interests: cleanTags(input.interests, LIMITS.interests),
    goals: cleanTags(input.goals, LIMITS.goals),
    lookingFor: [...new Set(input.lookingFor)],
    projects: input.projects.slice(0, LIMITS.projects),
    experience: input.experience.slice(0, LIMITS.experience),
    education: input.education.slice(0, LIMITS.education),
    certifications: input.certifications.slice(0, LIMITS.certifications),
  };

  // A project may only show an image that this member uploaded.
  assertOwnsProjectImages(
    userId,
    cleaned.projects.flatMap((project) => (project.imageUrl ? [project.imageUrl] : [])),
  );

  // Once a profile is discoverable it must stay complete enough to be shown.
  if (options.completeOnboarding || current.onboarded) {
    const blockers = onboardingBlockers(cleaned);
    if (blockers.length > 0) {
      throw badRequest(`Add ${blockers.join(', ')} to finish your profile.`);
    }
  }

  transaction(() => {
    run(
      `UPDATE profiles SET full_name = ?, headline = ?, profession = ?, workplace = ?, specialisation = ?, location = ?,
         about = ?, aspirations = ?, linkedin_url = ?, onboarded = MAX(onboarded, ?), updated_at = ?
       WHERE user_id = ?`,
      cleaned.fullName,
      cleaned.headline,
      cleaned.profession,
      cleaned.workplace,
      cleaned.specialisation,
      cleaned.location,
      cleaned.about,
      cleaned.aspirations,
      cleaned.linkedinUrl,
      options.completeOnboarding ? 1 : 0,
      nowIso(),
      userId,
    );
    replaceTags('skills', userId, cleaned.skills);
    replaceTags('interests', userId, cleaned.interests);
    replaceTags('goals', userId, cleaned.goals);

    run('DELETE FROM profile_looking_for WHERE user_id = ?', userId);
    for (const type of cleaned.lookingFor) {
      run('INSERT INTO profile_looking_for (user_id, type) VALUES (?, ?)', userId, type);
    }

    run('DELETE FROM projects WHERE user_id = ?', userId);
    cleaned.projects.forEach((project, position) => {
      const { lastId } = run(
        `INSERT INTO projects (user_id, title, description, type, role, year, url, image_url, position)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        userId,
        project.title,
        project.description,
        project.type,
        project.role,
        project.year,
        project.url,
        project.imageUrl,
        position,
      );
      for (const skill of cleanTags(project.skills, LIMITS.projectSkills)) {
        run('INSERT OR IGNORE INTO project_skills (project_id, skill_id) VALUES (?, ?)', lastId, tagId('skills', skill));
      }
    });

    run('DELETE FROM experiences WHERE user_id = ?', userId);
    cleaned.experience.forEach((item, position) => {
      run(
        `INSERT INTO experiences (user_id, title, company, location, start_date, end_date, description, position)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        userId,
        item.title,
        item.company,
        item.location,
        item.startDate || null,
        item.endDate || null,
        item.description,
        position,
      );
    });

    run('DELETE FROM education WHERE user_id = ?', userId);
    cleaned.education.forEach((item, position) => {
      run(
        'INSERT INTO education (user_id, school, degree, field, start_year, end_year, position) VALUES (?, ?, ?, ?, ?, ?, ?)',
        userId,
        item.school,
        item.degree,
        item.field,
        item.startYear,
        item.endYear,
        position,
      );
    });

    run('DELETE FROM certifications WHERE user_id = ?', userId);
    cleaned.certifications.forEach((item, position) => {
      run('INSERT INTO certifications (user_id, name, issuer, year, position) VALUES (?, ?, ?, ?, ?)', userId, item.name, item.issuer, item.year, position);
    });
  });

  // Images uploaded for projects that were then removed or replaced are no longer needed.
  await removeUnusedProjectImages(userId);
  return getProfile(userId);
}

// ---------- Vocabulary for filters and suggestions ----------

export function getMeta(): Meta {
  const tags = (table: TagTable) => {
    const { link, column } = TAG_JOIN[table];
    return all<{ name: string }>(
      `SELECT t.name FROM ${table} t
       WHERE t.curated = 1 OR EXISTS (
         SELECT 1 FROM ${link} l JOIN profiles p ON p.user_id = l.user_id
         WHERE l.${column} = t.id AND p.onboarded = 1)
       ORDER BY t.name COLLATE NOCASE`,
    ).map((row) => row.name);
  };
  const distinct = (column: 'profession' | 'workplace' | 'specialisation') =>
    all<{ value: string }>(
      `SELECT DISTINCT ${column} AS value FROM profiles WHERE onboarded = 1 AND ${column} <> '' ORDER BY value COLLATE NOCASE`,
    ).map((row) => row.value);

  return {
    skills: tags('skills'),
    interests: tags('interests'),
    goals: tags('goals'),
    professions: distinct('profession'),
    workplaces: distinct('workplace'),
    specialisations: distinct('specialisation'),
  };
}
