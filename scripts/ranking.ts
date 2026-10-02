// Prints the discovery ranking for one demo account, with the reasons behind each score.
// Usage: npx tsx scripts/ranking.ts [email-local-part]   (default: alex)
import { get } from '../server/db/connection';
import { DEMO_EMAIL_DOMAIN } from '../server/db/seed-data';
import { getDiscovery } from '../server/services/discovery.service';

const key = process.argv[2] ?? 'alex';
const user = get<{ id: number }>('SELECT id FROM users WHERE email = ?', `${key}@${DEMO_EMAIL_DOMAIN}`);
if (!user) {
  console.error(`No demo account "${key}". Run "npm run seed" first.`);
  process.exit(1);
}

const { people, stats } = getDiscovery(user.id, {
  profession: '',
  workplace: '',
  specialisation: '',
  skills: [],
  interests: [],
  goals: [],
  projectType: '',
  lookingFor: '',
  sort: 'relevance',
});

console.log(`Discovery ranking for ${key} (${stats.remaining} profiles)\n`);
for (const person of people) {
  const reasons = person.relevance.reasons.map((reason) => (reason.detail ? `${reason.label} [${reason.detail}]` : reason.label));
  console.log(`${String(person.relevance.score).padStart(3)}  ${person.relevance.tier.padEnd(8)} ${person.profile.fullName} — ${person.profile.profession}`);
  console.log(`     ${reasons.join(' | ') || 'No strong signals'}`);
}
