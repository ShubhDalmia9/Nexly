import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config';
import { hashPasswordSync } from '../lib/password';
import { all, run, transaction } from './connection';
import { applySchema, dropAllTables } from './migrate';
import {
  CONNECTIONS,
  CURATED_GOALS,
  CURATED_INTERESTS,
  CURATED_SKILLS,
  DEMO_EMAIL_DOMAIN,
  HISTORY,
  PEOPLE,
  SKIPS,
  type SeedPerson,
} from './seed-data';

/** Every seeded account signs in with this password. It is documented in the README. */
export const DEMO_PASSWORD = 'nexly-demo-2026';

const AVATAR_BACKGROUNDS = ['e8e4ff', 'd8f3e7', 'ffe6d5', 'dcebff', 'fde6ee', 'fff1c9', 'e2f0f1'];

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

/**
 * Draws an illustrated avatar for each demo person (no photos of real people
 * are used). If the generator is unavailable the profiles simply fall back to
 * initials.
 */
async function generateAvatars(people: SeedPerson[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  try {
    const { createAvatar } = await import('@dicebear/core');
    const { notionists } = await import('@dicebear/collection');
    people.forEach((person, index) => {
      const svg = createAvatar(notionists, {
        seed: person.fullName,
        backgroundColor: [AVATAR_BACKGROUNDS[index % AVATAR_BACKGROUNDS.length]],
        beardProbability: 0,
        scale: 110,
        translateY: 4,
      }).toString();
      const filename = `seed-${person.key}.svg`;
      fs.writeFileSync(path.join(config.uploadsDir, filename), svg, 'utf8');
      urls.set(person.key, `/uploads/${filename}`);
    });
  } catch (error) {
    console.warn('[nexly] Could not generate demo avatars; using initials instead.', error);
  }
  return urls;
}

function insertVocabulary(table: 'skills' | 'interests' | 'goals', names: string[]): void {
  for (const name of names) {
    run(`INSERT INTO ${table} (name, curated) VALUES (?, 1) ON CONFLICT(name) DO UPDATE SET curated = 1`, name);
  }
}

function vocabularyIds(table: 'skills' | 'interests' | 'goals'): Map<string, number> {
  return new Map(all<{ id: number; name: string }>(`SELECT id, name FROM ${table}`).map((row) => [row.name.toLowerCase(), row.id]));
}

export async function seedDatabase(): Promise<{ people: number }> {
  fs.mkdirSync(config.uploadsDir, { recursive: true });
  const avatars = await generateAvatars(PEOPLE);

  transaction(() => {
    insertVocabulary('skills', CURATED_SKILLS);
    insertVocabulary('interests', CURATED_INTERESTS);
    insertVocabulary('goals', CURATED_GOALS);
    // Tags used by demo people or their projects that are not in the starter lists.
    for (const person of PEOPLE) {
      for (const skill of [...person.skills, ...person.projects.flatMap((project) => project.skills)]) {
        run('INSERT INTO skills (name) VALUES (?) ON CONFLICT(name) DO NOTHING', skill);
      }
      for (const interest of person.interests) run('INSERT INTO interests (name) VALUES (?) ON CONFLICT(name) DO NOTHING', interest);
      for (const goal of person.goals) run('INSERT INTO goals (name) VALUES (?) ON CONFLICT(name) DO NOTHING', goal);
    }
    const skillIds = vocabularyIds('skills');
    const interestIds = vocabularyIds('interests');
    const goalIds = vocabularyIds('goals');

    const userIds = new Map<string, number>();
    for (const person of PEOPLE) {
      const joinedAt = hoursAgo(person.joinedDaysAgo * 24);
      const { lastId: userId } = run(
        'INSERT INTO users (email, is_demo, created_at) VALUES (?, 1, ?)',
        `${person.key}@${DEMO_EMAIL_DOMAIN}`,
        joinedAt,
      );
      userIds.set(person.key, userId);
      run('INSERT INTO password_credentials (user_id, password_hash, updated_at) VALUES (?, ?, ?)', userId, hashPasswordSync(DEMO_PASSWORD), joinedAt);
      run('INSERT INTO user_settings (user_id, updated_at) VALUES (?, ?)', userId, joinedAt);

      run(
        `INSERT INTO profiles (user_id, full_name, headline, profession, workplace, specialisation, location, about, aspirations,
           photo_url, onboarded, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        userId,
        person.fullName,
        `${person.profession} at ${person.workplace} · ${person.specialisation}`,
        person.profession,
        person.workplace,
        person.specialisation,
        person.location,
        person.about,
        person.aspirations,
        avatars.get(person.key) ?? null,
        joinedAt,
      );
      person.skills.forEach((skill, position) => {
        run('INSERT INTO profile_skills (user_id, skill_id, position) VALUES (?, ?, ?)', userId, skillIds.get(skill.toLowerCase())!, position);
      });
      person.interests.forEach((interest, position) => {
        run('INSERT INTO profile_interests (user_id, interest_id, position) VALUES (?, ?, ?)', userId, interestIds.get(interest.toLowerCase())!, position);
      });
      person.goals.forEach((goal, position) => {
        run('INSERT INTO profile_goals (user_id, goal_id, position) VALUES (?, ?, ?)', userId, goalIds.get(goal.toLowerCase())!, position);
      });
      for (const type of person.lookingFor) {
        run('INSERT INTO profile_looking_for (user_id, type) VALUES (?, ?)', userId, type);
      }
      person.projects.forEach((project, position) => {
        const { lastId: projectId } = run(
          'INSERT INTO projects (user_id, title, description, type, role, year, position) VALUES (?, ?, ?, ?, ?, ?, ?)',
          userId,
          project.title,
          project.description,
          project.type,
          project.role,
          project.year,
          position,
        );
        for (const skill of project.skills) {
          run('INSERT OR IGNORE INTO project_skills (project_id, skill_id) VALUES (?, ?)', projectId, skillIds.get(skill.toLowerCase())!);
        }
      });
      const history = HISTORY[person.key];
      if (history) {
        const insertRole = (position: number, title: string, company: string, start: string, end: string | null) =>
          run(
            'INSERT INTO experiences (user_id, title, company, location, start_date, end_date, position) VALUES (?, ?, ?, ?, ?, ?, ?)',
            userId,
            title,
            company,
            position === 0 ? person.location : '',
            start,
            end,
            position,
          );
        insertRole(0, person.profession, person.workplace, history.since, null);
        insertRole(1, history.past[0], history.past[1], history.past[2], history.past[3]);
        const [school, degree, field, startYear, endYear] = history.school;
        run(
          'INSERT INTO education (user_id, school, degree, field, start_year, end_year, position) VALUES (?, ?, ?, ?, ?, ?, 0)',
          userId,
          school,
          degree,
          field,
          startYear,
          endYear,
        );
        if (history.cert) {
          run('INSERT INTO certifications (user_id, name, issuer, year, position) VALUES (?, ?, ?, ?, 0)', userId, ...history.cert);
        }
      }
      run(
        "INSERT INTO notifications (user_id, actor_id, type, read_at, created_at) VALUES (?, NULL, 'welcome', ?, ?)",
        userId,
        joinedAt,
        joinedAt,
      );
    }

    const id = (key: string) => {
      const value = userIds.get(key);
      if (!value) throw new Error(`Unknown seed person "${key}"`);
      return value;
    };
    const insertDecision = (from: number, to: number, action: 'connect' | 'skip', at: string) =>
      run('INSERT INTO decisions (viewer_id, target_id, action, created_at) VALUES (?, ?, ?, ?)', from, to, action, at);

    for (const connection of CONNECTIONS) {
      const from = id(connection.from);
      const to = id(connection.to);
      const requestedAt = hoursAgo(connection.requestedHoursAgo);
      const accepted = connection.status === 'accepted';
      const acceptedAt = accepted ? hoursAgo(connection.acceptedHoursAgo ?? connection.requestedHoursAgo) : null;

      const { lastId: connectionId } = run(
        'INSERT INTO connections (requester_id, addressee_id, status, created_at, responded_at) VALUES (?, ?, ?, ?, ?)',
        from,
        to,
        connection.status,
        requestedAt,
        acceptedAt,
      );
      insertDecision(from, to, 'connect', requestedAt);
      // A request stays unread until it has been answered.
      run(
        "INSERT INTO notifications (user_id, actor_id, type, connection_id, read_at, created_at) VALUES (?, ?, 'connection_request', ?, ?, ?)",
        to,
        from,
        connectionId,
        acceptedAt,
        requestedAt,
      );
      if (acceptedAt) {
        insertDecision(to, from, 'connect', acceptedAt);
        run(
          "INSERT INTO notifications (user_id, actor_id, type, connection_id, read_at, created_at) VALUES (?, ?, 'connection_accepted', ?, ?, ?)",
          from,
          to,
          connectionId,
          acceptedAt,
          acceptedAt,
        );
      }
    }

    for (const skip of SKIPS) insertDecision(id(skip.from), id(skip.to), 'skip', hoursAgo(skip.hoursAgo));
  });

  return { people: PEOPLE.length };
}

/** `npm run seed`: wipes the database and uploaded photos, then loads the demo data again. */
async function resetAndSeed(): Promise<void> {
  dropAllTables();
  for (const file of fs.readdirSync(config.uploadsDir)) fs.rmSync(path.join(config.uploadsDir, file), { force: true });
  applySchema();
  const { people } = await seedDatabase();
  console.log(`[nexly] Database reset with ${people} member profiles.`);
  console.log(`[nexly] They sign in as <first name>@${DEMO_EMAIL_DOMAIN}; see the README for the password.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  resetAndSeed().catch((error) => {
    console.error('[nexly] Seeding failed:', error);
    process.exit(1);
  });
}
