// End-to-end API test. Starts the real server against a throwaway database and walks through
// every user journey. Usage: npm run test:e2e
//
// The email providers are replaced by local stand-ins that speak the same protocols: the Resend
// HTTP API and an SMTP server. Everything inside Nexly runs for real.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import net, { type AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { zipSync } from 'fflate';
import { sampleLinkedInPdf } from './lib/make-pdf';

// ---------- Stand-ins for external services ----------

const mock = {
  resend: [] as { authorization: string; body: Record<string, unknown> }[],
  smtp: [] as string[],
};

const readBody = (req: http.IncomingMessage) =>
  new Promise<string>((resolve) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
  });

const mockServer = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://mock');
  const json = (status: number, body: unknown) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };
  if (url.pathname === '/resend/emails') {
    mock.resend.push({ authorization: req.headers.authorization ?? '', body: JSON.parse(await readBody(req)) });
    return json(200, { id: 'email_1' });
  }
  json(404, {});
});

/** Just enough SMTP to accept one message per connection. */
const smtpServer = net.createServer((socket) => {
  let inData = false;
  let message = '';
  socket.write('220 localhost test smtp\r\n');
  socket.on('data', (chunk) => {
    const text = chunk.toString();
    if (inData) {
      message += text;
      if (message.endsWith('\r\n.\r\n')) {
        mock.smtp.push(message);
        inData = false;
        message = '';
        socket.write('250 queued\r\n');
      }
      return;
    }
    for (const line of text.split('\r\n').filter(Boolean)) {
      const command = line.slice(0, 4).toUpperCase();
      if (command === 'EHLO' || command === 'HELO') socket.write('250 localhost\r\n');
      else if (command === 'DATA') {
        inData = true;
        socket.write('354 go ahead\r\n');
      } else if (command === 'QUIT') socket.end('221 bye\r\n');
      else socket.write('250 ok\r\n');
    }
  });
});

const listen = (server: net.Server) => new Promise<number>((resolve) => server.listen(0, () => resolve((server.address() as AddressInfo).port)));
const mockPort = await listen(mockServer);
const smtpPort = await listen(smtpServer);
const probe = net.createServer();
const appPort = await listen(probe);
await new Promise((resolve) => probe.close(resolve));

// ---------- Environment (set before the app is imported) ----------

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexly-e2e-'));
const mockBase = `http://localhost:${mockPort}`;
Object.assign(process.env, {
  DATA_DIR: dataDir,
  PORT: String(appPort),
  DEMO_MODE: 'true',
  EMAIL_PROVIDER: 'dev',
});

const { createApp } = await import('../server/app');
const { config } = await import('../server/config');
const { applySchema } = await import('../server/db/migrate');
const { seedDatabase, DEMO_PASSWORD } = await import('../server/db/seed');
const { db } = await import('../server/db/connection');
const { sendEmail } = await import('../server/email/mailer');
const { errorHandler } = await import('../server/middleware/errors');

applySchema();
await seedDatabase();
const app = createApp();
app.use(errorHandler);
const server = http.createServer(app);
await new Promise<void>((resolve) => server.listen(appPort, resolve));
const base = `http://localhost:${appPort}`;

// ---------- Helpers ----------

type Json = any;

/** A browser-like client that keeps its own cookies and does not follow redirects. */
class Client {
  private cookies = new Map<string, string>();

  private async send(method: string, url: string, init: { body?: string | Uint8Array; headers?: Record<string, string> } = {}) {
    const response = await fetch(base + url, {
      method,
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0) Chrome/126.0 Safari/537.36',
        ...(this.cookies.size ? { Cookie: [...this.cookies].map(([name, value]) => `${name}=${value}`).join('; ') } : {}),
        ...init.headers,
      },
      body: init.body as never,
    });
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(';');
      const [name, value] = pair.split('=');
      if (value === '' || /Expires=Thu, 01 Jan 1970/.test(cookie)) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
    const json: Json = await response.json().catch(() => null);
    return { status: response.status, json, location: response.headers.get('location') ?? '' };
  }

  request(method: string, url: string, body?: unknown, headers: Record<string, string> = {}) {
    return this.send(method, url, {
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
    });
  }
  get = (url: string) => this.request('GET', url);
  post = (url: string, body: unknown = {}) => this.request('POST', url, body);
  put = (url: string, body: unknown) => this.request('PUT', url, body);
  delete = (url: string) => this.request('DELETE', url);
  upload = (method: string, url: string, bytes: Uint8Array, contentType: string) =>
    this.send(method, url, { body: bytes, headers: { 'Content-Type': contentType } });

  async login(email: string, password: string) {
    const result = await this.post('/api/auth/login', { email, password });
    assert.equal(result.status, 200, `login as ${email}`);
    return result.json.user;
  }
}

interface CapturedEmail {
  to_email: string;
  subject: string;
  html: string;
  text: string;
  template: string;
}
const emailsTo = (to: string) => db.prepare('SELECT * FROM dev_mailbox WHERE to_email = ? ORDER BY id').all(to) as unknown as CapturedEmail[];
const lastEmail = (to: string, template: string) => {
  const email = emailsTo(to).filter((item) => item.template === template).at(-1);
  assert.ok(email, `expected a "${template}" email to ${to}`);
  return email;
};
const linkToken = (email: CapturedEmail) => new URL(/href="([^"]+token=[^"]+)"/.exec(email.html)![1]).searchParams.get('token')!;
/** Pretends time has passed, so the "one email per minute" cooldown does not slow the test down. */
const skipCooldown = () => db.exec("UPDATE email_tokens SET created_at = '2020-01-01T00:00:00.000Z'");
const count = (sql: string, ...params: (string | number)[]) => (db.prepare(sql).get(...params) as { n: number }).n;

/** Creates an account and returns a signed-in client. */
async function signUp(fullName: string, email: string, password: string): Promise<{ client: Client; user: Json }> {
  const client = new Client();
  const done = await client.post('/api/auth/signup', { fullName, email, password });
  assert.equal(done.status, 201);
  return { client, user: done.json.user };
}

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

let passed = 0;
async function step(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (error) {
    console.error(`FAIL  ${name}`);
    throw error;
  }
}
const section = (title: string) => console.log(`\n${title}`);

const jordanEmail = 'jordan.lee@example.com';
const jordanPassword = 'first-pass-123';
let jordan = new Client();
let jordanId = 0;
let mayaId = 0;
const maya = new Client();
const alex = new Client();
const stranger = new Client();

const baseProfile = {
  fullName: 'Jordan Lee',
  headline: '',
  profession: 'Robotics Engineer',
  workplace: 'Example Works',
  specialisation: 'Mobile manipulation',
  location: 'Singapore',
  about: 'I build software for mobile robots and enjoy working with mechanical engineers on real hardware.',
  aspirations: 'Lead a robotics team and ship a product.',
  linkedinUrl: '',
  skills: ['Python', 'ROS', 'python', '  C++  '],
  interests: ['Robotics', 'Drones'],
  goals: ['Ship a hardware product'],
  lookingFor: ['collaborator', 'mentor'],
  projects: [{ title: 'Line-following robot', description: 'A small robot.', type: 'Hardware', role: 'Builder', year: 2024, url: '', skills: ['ROS'], imageUrl: null }],
  experience: [],
  education: [],
  certifications: [],
};

try {
  // =====================================================================
  section('Flow A · Creating an account and logging in');

  await step('rejects unauthenticated access', async () => {
    assert.equal((await stranger.get('/api/auth/me')).json.user, null);
    assert.equal((await stranger.get('/api/discovery')).status, 401);
    assert.equal((await stranger.post('/api/decisions', { targetId: 1, action: 'connect' })).status, 401);
    assert.equal((await stranger.get('/api/account/security')).status, 401);
  });

  await step('validates the sign-up form', async () => {
    const bad = await jordan.post('/api/auth/signup', { fullName: 'J', email: 'nope', password: 'short' });
    assert.equal(bad.status, 400);
    assert.ok(bad.json.error.fields.email && bad.json.error.fields.fullName && bad.json.error.fields.password);
    assert.equal(count('SELECT COUNT(*) AS n FROM users WHERE email = ?', jordanEmail), 0);
  });

  await step('name, email and password create the account and sign in, with no email step', async () => {
    const before = count('SELECT COUNT(*) AS n FROM dev_mailbox');
    const done = await jordan.post('/api/auth/signup', { fullName: 'Jordan Lee', email: jordanEmail, password: jordanPassword });
    assert.equal(done.status, 201);
    jordanId = done.json.user.id;
    assert.equal(done.json.user.email, jordanEmail);
    assert.equal(done.json.user.profile.fullName, 'Jordan Lee');
    assert.equal(done.json.user.profile.onboarded, false);
    assert.equal((await jordan.get('/api/auth/me')).json.user.id, jordanId, 'the new member is signed in straight away');
    assert.equal(count('SELECT COUNT(*) AS n FROM dev_mailbox'), before, 'no email is sent');
    assert.equal(count('SELECT COUNT(*) AS n FROM email_tokens'), 0);
  });

  await step('the same email and password log in again', async () => {
    assert.equal((await stranger.post('/api/auth/login', { email: jordanEmail, password: 'not-the-password-1' })).status, 401);
    const again = new Client();
    const result = await again.post('/api/auth/login', { email: jordanEmail.toUpperCase(), password: jordanPassword });
    assert.equal(result.status, 200);
    assert.equal(result.json.user.id, jordanId);
    assert.equal((await again.post('/api/auth/logout')).status, 200);
    assert.equal((await again.get('/api/auth/me')).json.user, null);
  });

  await step('an email address can only have one account', async () => {
    const again = await stranger.post('/api/auth/signup', { fullName: 'Copy Cat', email: jordanEmail.toUpperCase(), password: 'another-pass-1' });
    assert.equal(again.status, 409);
    assert.equal(again.json.error.code, 'EMAIL_TAKEN');
    assert.ok(again.json.error.fields.email);
    assert.equal(count('SELECT COUNT(*) AS n FROM users WHERE email = ?', jordanEmail), 1);
  });

  await step('stores the password only as a salted hash', async () => {
    const row = db.prepare('SELECT password_hash FROM password_credentials WHERE user_id = ?').get(jordanId) as { password_hash: string };
    assert.ok(row.password_hash.startsWith('scrypt$'));
    assert.ok(!row.password_hash.includes(jordanPassword));
  });

  // =====================================================================
  section('Onboarding and profile');

  await step('blocks discovery until the profile is complete', async () => {
    const result = await jordan.get('/api/discovery');
    assert.equal(result.status, 403);
    assert.equal(result.json.error.code, 'PROFILE_INCOMPLETE');
  });

  await step('validates and saves the profile, including history', async () => {
    assert.equal((await jordan.put('/api/profile', { ...baseProfile, lookingFor: ['wizard'] })).status, 400);
    assert.equal((await jordan.put('/api/profile', { ...baseProfile, skills: [], completeOnboarding: true })).status, 400);
    const badDates = await jordan.put('/api/profile', {
      ...baseProfile,
      experience: [{ title: 'Engineer', company: 'X', location: '', startDate: '2024-05', endDate: '2022', description: '' }],
    });
    assert.ok(badDates.json.error.fields['experience.0.endDate']);

    const saved = await jordan.put('/api/profile', {
      ...baseProfile,
      headline: 'Robotics Engineer at Example Works',
      experience: [
        { title: 'Robotics Engineer', company: 'Example Works', location: 'Singapore', startDate: '2022-03', endDate: '', description: 'Navigation.' },
        { title: 'Software Engineer', company: 'Voltline Labs', location: '', startDate: '2019', endDate: '2022-02', description: '' },
      ],
      education: [{ school: 'Lakeside Institute of Technology', degree: 'BTech', field: 'Computer Science', startYear: 2015, endYear: 2019 }],
      certifications: [{ name: 'Robot Safety', issuer: 'Safety Board', year: 2023 }],
      completeOnboarding: true,
    });
    assert.equal(saved.status, 200);
    const profile = saved.json.user.profile;
    assert.equal(profile.onboarded, true);
    assert.deepEqual(profile.skills, ['Python', 'ROS', 'C++'], 'tags are trimmed and de-duplicated');
    assert.equal(profile.experience.length, 2);
    assert.equal(profile.experience[0].endDate, '', 'an empty end date means the role is current');
    assert.equal(profile.education[0].school, 'Lakeside Institute of Technology');
    assert.equal(profile.certifications[0].year, 2023);
    assert.equal(saved.json.user.completion.percent, 90, 'everything except a photo');
  });

  // =====================================================================
  section('Flow E · Image uploads');

  let photoUrl = '';
  await step('uploads, serves and replaces a profile photo', async () => {
    const uploaded = await jordan.upload('PUT', '/api/profile/photo', PNG, 'image/png');
    assert.equal(uploaded.status, 200);
    photoUrl = uploaded.json.user.profile.photoUrl;
    assert.match(photoUrl, /^\/uploads\/u\d+-[0-9a-f]+\.png$/);
    const served = await fetch(base + photoUrl);
    assert.equal(served.status, 200);
    assert.equal(served.headers.get('content-type'), 'image/png');
    assert.equal(uploaded.json.user.completion.percent, 100);
    assert.equal(count("SELECT COUNT(*) AS n FROM images WHERE user_id = ? AND kind = 'avatar'", jordanId), 1);

    const replaced = await jordan.upload('PUT', '/api/profile/photo', PNG, 'image/png');
    assert.notEqual(replaced.json.user.profile.photoUrl, photoUrl);
    assert.equal((await fetch(base + photoUrl)).status, 404, 'the previous file is deleted');
    assert.equal(count("SELECT COUNT(*) AS n FROM images WHERE user_id = ? AND kind = 'avatar'", jordanId), 1);
    photoUrl = replaced.json.user.profile.photoUrl;
  });

  await step('rejects files that are not real images, and files that are too large', async () => {
    const html = await jordan.upload('PUT', '/api/profile/photo', Buffer.from('<html><script>alert(1)</script></html>'), 'image/png');
    assert.equal(html.status, 415);
    assert.equal(html.json.error.code, 'UNSUPPORTED_IMAGE');
    assert.equal((await jordan.upload('PUT', '/api/profile/photo', PNG, 'application/x-msdownload')).status, 415);
    const huge = await jordan.upload('PUT', '/api/profile/photo', new Uint8Array(3 * 1024 * 1024), 'image/jpeg');
    assert.equal(huge.status, 413);
    assert.equal((await stranger.upload('PUT', '/api/profile/photo', PNG, 'image/png')).status, 401);
  });

  await step('the photo shows on the profile and on the discovery card', async () => {
    await maya.login('maya@nexly.example', DEMO_PASSWORD);
    const deck = (await maya.get('/api/discovery')).json;
    const card = deck.people.find((p: Json) => p.profile.userId === jordanId);
    assert.equal(card.profile.photoUrl, photoUrl);
    assert.equal((await maya.get(`/api/users/${jordanId}`)).json.person.profile.photoUrl, photoUrl);
    mayaId = (await maya.get('/api/auth/me')).json.user.id;
  });

  await step('project images: owned uploads attach, other members’ images are refused, unused ones are cleaned up', async () => {
    const first = (await jordan.upload('POST', '/api/profile/project-image', PNG, 'image/png')).json.url as string;
    const mayaImage = (await maya.upload('POST', '/api/profile/project-image', PNG, 'image/png')).json.url as string;
    const withImage = (imageUrl: string | null) => ({
      ...(jordanProfile()),
      projects: [{ ...baseProfile.projects[0], imageUrl }],
    });
    const stolen = await jordan.put('/api/profile', withImage(mayaImage));
    assert.equal(stolen.status, 403, 'cannot attach an image another member uploaded');
    assert.equal((await jordan.put('/api/profile', withImage('https://evil.example/x.png'))).status, 400);

    const saved = await jordan.put('/api/profile', withImage(first));
    assert.equal(saved.json.user.profile.projects[0].imageUrl, first);
    assert.equal((await fetch(base + first)).status, 200);

    const second = (await jordan.upload('POST', '/api/profile/project-image', PNG, 'image/png')).json.url as string;
    await jordan.put('/api/profile', withImage(second));
    assert.equal((await fetch(base + first)).status, 404, 'the replaced image is removed from storage');
    await jordan.put('/api/profile', withImage(null));
    assert.equal((await fetch(base + second)).status, 404);
    assert.equal(count("SELECT COUNT(*) AS n FROM images WHERE user_id = ? AND kind = 'project'", jordanId), 0);
  });

  function jordanProfile() {
    const profile = (db.prepare('SELECT headline FROM profiles WHERE user_id = ?').get(jordanId) as { headline: string }) ?? { headline: '' };
    return {
      ...baseProfile,
      headline: profile.headline,
      experience: [
        { title: 'Robotics Engineer', company: 'Example Works', location: 'Singapore', startDate: '2022-03', endDate: '', description: 'Navigation.' },
        { title: 'Software Engineer', company: 'Voltline Labs', location: '', startDate: '2019', endDate: '2022-02', description: '' },
      ],
      education: [{ school: 'Lakeside Institute of Technology', degree: 'BTech', field: 'Computer Science', startYear: 2015, endYear: 2019 }],
      certifications: [{ name: 'Robot Safety', issuer: 'Safety Board', year: 2023 }],
    };
  }

  await step('removes the profile photo and its file', async () => {
    const removed = await jordan.delete('/api/profile/photo');
    assert.equal(removed.json.user.profile.photoUrl, null);
    assert.equal((await fetch(base + photoUrl)).status, 404);
    assert.equal(count('SELECT COUNT(*) AS n FROM images WHERE user_id = ?', jordanId), 0);
  });

  // =====================================================================
  section('Discovery, decisions and connections (existing behaviour)');

  await step('ranks discovery by relevance and uses work history and education', async () => {
    const { json } = await jordan.get('/api/discovery');
    const scores: number[] = json.people.map((p: Json) => p.relevance.score);
    assert.ok(json.people.length > 20);
    assert.deepEqual(scores, [...scores].sort((a, b) => b - a));
    assert.ok(json.people.every((p: Json) => p.profile.userId !== jordanId));
    const robotics = json.people.slice(0, 5).filter((p: Json) => [...p.profile.skills, ...p.profile.interests].includes('Robotics'));
    assert.ok(robotics.length >= 4, 'a robotics profile sees robotics people first');

    const kenji = json.people.find((p: Json) => p.profile.fullName === 'Kenji Watanabe');
    assert.ok(kenji.relevance.reasons.some((r: Json) => r.kind === 'employer' && r.detail === 'Voltline Labs'), 'a shared past employer is a reason');
    const sofia = json.people.find((p: Json) => p.profile.fullName === 'Sofia Lindqvist');
    assert.ok(sofia.relevance.reasons.some((r: Json) => r.kind === 'school'), 'a shared school is a reason');
    assert.ok(sofia.profile.experience.length >= 2 && sofia.profile.education.length === 1);
  });

  await step('applies filters and sorting', async () => {
    const bySkill = await jordan.get('/api/discovery?skills=ROS,Python');
    assert.ok(bySkill.json.people.length > 0);
    assert.ok(bySkill.json.people.every((p: Json) => p.profile.skills.includes('ROS') && p.profile.skills.includes('Python')));
    const mentors = await jordan.get('/api/discovery?lookingFor=mentor');
    assert.ok(mentors.json.people.every((p: Json) => p.profile.lookingFor.includes('mentee')));
    const newest = await jordan.get('/api/discovery?sort=newest');
    const joined: string[] = newest.json.people.map((p: Json) => p.profile.joinedAt);
    assert.deepEqual(joined, [...joined].sort().reverse());
    assert.equal((await jordan.get('/api/discovery?skills=Nonexistent')).json.people.length, 0);
  });

  await step('Skip sets a profile aside, and undo brings it back', async () => {
    const before = (await jordan.get('/api/discovery')).json;
    const target = before.people.at(-1).profile.userId;
    const skipped = await jordan.post('/api/decisions', { targetId: target, action: 'skip' });
    assert.equal(skipped.json.outcome, 'skipped');
    const after = (await jordan.get('/api/discovery')).json;
    assert.equal(after.stats.remaining, before.stats.remaining - 1);
    const undone = await jordan.post('/api/decisions/undo');
    assert.equal(undone.json.person.profile.userId, target);
    assert.equal((await jordan.post('/api/decisions', { targetId: jordanId, action: 'connect' })).status, 400, 'no acting on your own profile');
  });

  let requestId = 0;
  await step('Connect creates exactly one request and one notification', async () => {
    const sent = await jordan.post('/api/decisions', { targetId: mayaId, action: 'connect' });
    assert.equal(sent.json.outcome, 'requested');
    const again = await jordan.post('/api/connections', { targetId: mayaId });
    assert.equal(again.json.error.code, 'ALREADY_PENDING');
    assert.equal(count('SELECT COUNT(*) AS n FROM connections WHERE requester_id = ? AND addressee_id = ?', jordanId, mayaId), 1);
    const insert = db.prepare("INSERT INTO connections (requester_id, addressee_id, status, created_at) VALUES (?, ?, 'pending', 'now')");
    assert.throws(() => insert.run(mayaId, jordanId), /UNIQUE/, 'the database refuses the reverse duplicate');
    assert.throws(() => insert.run(jordanId, jordanId), /CHECK/, 'and a self connection');

    const notifications = (await maya.get('/api/notifications')).json;
    const request = notifications.items.find((n: Json) => n.actor?.userId === jordanId);
    assert.equal(request.type, 'connection_request');
    assert.equal(request.connectionStatus, 'pending_received');
    requestId = request.connectionId;
    assert.equal(emailsTo('maya@nexly.example').length, 0, 'the members that come with the app are never emailed');
  });

  await step('only the recipient can answer a request', async () => {
    await alex.login('alex@nexly.example', DEMO_PASSWORD);
    assert.equal((await alex.post(`/api/connections/${requestId}/accept`)).status, 403);
    assert.equal((await jordan.post(`/api/connections/${requestId}/accept`)).status, 403);
    assert.equal((await alex.delete(`/api/connections/${requestId}`)).status, 403);
  });

  await step('accepting connects both people, notifies and emails the sender', async () => {
    const accepted = await maya.post(`/api/connections/${requestId}/accept`);
    assert.equal(accepted.json.person.connection.status, 'connected');
    assert.equal(accepted.json.person.contactEmail, jordanEmail);
    const note = (await jordan.get('/api/notifications')).json.items.find((n: Json) => n.type === 'connection_accepted');
    assert.equal(note.actor.fullName, 'Maya Okafor');
    const overview = (await jordan.get('/api/connections')).json;
    assert.equal(overview.accepted[0].contactEmail, 'maya@nexly.example');

    const email = lastEmail(jordanEmail, 'connection-accepted');
    assert.equal(email.subject, 'Connection request accepted by Maya Okafor');
    assert.match(email.html, new RegExp(`/people/${mayaId}`));
  });

  await step('pressing Connect on someone who already asked accepts their request', async () => {
    const deck = (await alex.get('/api/discovery')).json;
    const kenji = deck.people.find((p: Json) => p.profile.fullName === 'Kenji Watanabe');
    assert.equal(kenji.relevance.reasons[0].kind, 'incoming');
    assert.equal((await alex.post('/api/decisions', { targetId: kenji.profile.userId, action: 'connect' })).json.outcome, 'connected');
    assert.equal((await alex.post('/api/decisions/undo')).status, 409);
  });

  await step('declining is private, and a sent request can be withdrawn', async () => {
    const deck = (await alex.get('/api/discovery')).json;
    const wei = deck.people.find((p: Json) => p.profile.fullName === 'Wei Chen');
    assert.equal((await alex.post(`/api/connections/${wei.connection.id}/decline`)).json.person.connection.status, 'declined_by_me');
    const weiClient = new Client();
    await weiClient.login('wei@nexly.example', DEMO_PASSWORD);
    assert.equal((await weiClient.get('/api/connections')).json.sent[0].connection.status, 'pending_sent');
    assert.equal((await weiClient.delete(`/api/connections/${wei.connection.id}`)).status, 200);
  });

  await step('search covers names, skills, workplaces, projects, past employers and schools', async () => {
    assert.equal((await jordan.get('/api/search?q=maya')).json.results[0].profile.fullName, 'Maya Okafor');
    const bySkill = (await jordan.get('/api/search?q=figma&scope=skill')).json;
    assert.ok(bySkill.results.length >= 3 && bySkill.results.every((r: Json) => r.profile.skills.includes('Figma')));
    assert.ok((await jordan.get('/api/search?q=robotic arm')).json.results.some((r: Json) => r.foundIn.some((m: string) => m.startsWith('Project'))));
    const byPastEmployer = (await jordan.get('/api/search?q=fernhill')).json;
    assert.ok(byPastEmployer.results.some((r: Json) => r.foundIn.includes('Past workplace')));
    const bySchool = (await jordan.get('/api/search?q=coastal school')).json;
    assert.ok(bySchool.results.length >= 3 && bySchool.results[0].foundIn.includes('Education'));
    assert.equal((await jordan.get('/api/search?q=zzzzqq')).json.results.length, 0);
  });

  await step('the dashboard summarises everything', async () => {
    const { json, status } = await maya.get('/api/dashboard');
    assert.equal(status, 200);
    assert.ok(json.recommended.length > 0 && json.incoming.length >= 1 && json.actions.length > 0);
    assert.ok(json.recentConnections.some((p: Json) => p.profile.userId === jordanId));
  });

  // =====================================================================
  section('Flow D · LinkedIn profile import');

  const { client: importer, user: importerUser } = await signUp('Riley Stone', 'riley@example.com', 'riley-pass-123');
  let importedDraft: Json = {};

  await step('reads a LinkedIn profile PDF into a draft profile', async () => {
    assert.equal((await stranger.upload('POST', '/api/import/linkedin/file?name=Profile.pdf', sampleLinkedInPdf(), 'application/pdf')).status, 401);
    const result = await importer.upload('POST', '/api/import/linkedin/file?name=Profile.pdf', sampleLinkedInPdf(), 'application/pdf');
    assert.equal(result.status, 201);
    const { draft, fileName, imported } = result.json;
    assert.equal(fileName, 'Profile.pdf');
    assert.equal(draft.fullName, 'Tara Venkatesan');
    assert.equal(draft.headline, 'Robotics Engineer at Orbit Mechatronics | Mobile manipulation');
    assert.equal(draft.location, 'Pune, Maharashtra, India');
    assert.equal(draft.profession, 'Robotics Engineer');
    assert.equal(draft.workplace, 'Orbit Mechatronics');
    assert.deepEqual(draft.skills, ['Robotics', 'Python', 'ROS']);
    assert.deepEqual(
      draft.experience.map((e: Json) => [e.title, e.company, e.startDate, e.endDate, e.location]),
      [
        ['Robotics Engineer', 'Orbit Mechatronics', '2023-03', '', 'Pune, India'],
        ['Controls Engineer', 'Fernhill Automation', '2020-07', '2023-02', 'Chennai, India'],
        ['Engineering Intern', 'Fernhill Automation', '2020-01', '2020-06', ''],
      ],
    );
    assert.match(draft.experience[0].description, /^Lead the manipulation stack.*perception\.$/);
    assert.equal(draft.education[0].field, 'Mechatronics Engineering');
    assert.equal(draft.certifications[0].name, 'Functional Safety for Machinery');
    assert.equal(draft.linkedinUrl, 'https://www.linkedin.com/in/tara-venkatesan-4b2a91', 'the link wrapped over two lines in the PDF is rejoined');
    for (const field of ['fullName', 'headline', 'profession', 'workplace', 'location', 'about', 'skills', 'experience', 'education', 'certifications']) {
      assert.ok(imported.includes(field), `${field} is reported as imported`);
    }
    assert.ok(!imported.includes('projects'), 'only what the PDF contains is reported as imported');
    importedDraft = draft;
  });

  await step('reads a LinkedIn data export ZIP into a draft profile', async () => {
    const sampleDir = path.join(import.meta.dirname, '..', 'samples', 'linkedin-export');
    const files: Record<string, Uint8Array> = {};
    for (const name of fs.readdirSync(sampleDir)) files[`Basic_LinkedInDataExport_10-02-2026/${name}`] = fs.readFileSync(path.join(sampleDir, name));
    const result = await importer.upload('POST', '/api/import/linkedin/file?name=Basic_LinkedInDataExport.zip', Buffer.from(zipSync(files)), 'application/zip');
    assert.equal(result.status, 201);
    const { draft, imported, fileName } = result.json;
    assert.equal(fileName, 'Basic_LinkedInDataExport.zip');
    assert.equal(draft.fullName, 'Tara Venkatesan');
    assert.equal(draft.headline, 'Robotics Engineer at Orbit Mechatronics | Mobile manipulation');
    assert.equal(draft.profession, 'Robotics Engineer', 'profession comes from the current position');
    assert.equal(draft.workplace, 'Orbit Mechatronics');
    assert.equal(draft.location, 'Pune, Maharashtra, India');
    assert.match(draft.about, /^I build software and controls/);
    // LinkedIn's "Python (Programming Language)" and "Robot Operating System (ROS)" join Nexly's existing tags.
    assert.deepEqual(draft.skills.slice(0, 4), ['Robotics', 'Python', 'C++', 'ROS']);
    assert.equal(draft.skills.length, 10);
    assert.ok(draft.interests.length > 0, 'interests come from the export');
    assert.equal(draft.experience.length, 3);
    assert.equal(draft.experience[0].startDate, '2023-03');
    assert.equal(draft.experience[1].endDate, '2023-02');
    assert.deepEqual(draft.education[0], { school: 'Deccan Institute of Engineering', degree: 'Bachelor of Technology - BTech', field: 'Mechatronics Engineering', startYear: 2016, endYear: 2020 });
    assert.equal(draft.projects.length, 2);
    assert.equal(draft.projects[0].title, 'Tabletop sorting arm');
    assert.equal(draft.projects[0].type, 'Hardware');
    assert.ok(draft.projects[0].skills.includes('Computer Vision') && draft.projects[0].skills.includes('ROS'));
    assert.equal(draft.projects[1].type, 'Open source');
    assert.equal(draft.certifications.length, 2);
    for (const field of ['fullName', 'headline', 'profession', 'workplace', 'about', 'skills', 'interests', 'experience', 'education', 'projects', 'certifications']) {
      assert.ok(imported.includes(field), `${field} is reported as imported`);
    }
    // Things the file does not contain are left for the member to add, never invented.
    assert.equal(draft.goals, undefined);
    assert.equal(draft.lookingFor, undefined);
    assert.equal(draft.aspirations, undefined);
  });

  await step('nothing is saved until the member confirms', async () => {
    const profile = (await importer.get('/api/auth/me')).json.user.profile;
    assert.equal(profile.fullName, 'Riley Stone');
    assert.equal(profile.profession, '');
    assert.deepEqual(profile.experience, []);
  });

  await step('rejects files that are not LinkedIn files', async () => {
    const text = await importer.upload('POST', '/api/import/linkedin/file?name=notes.pdf', Buffer.from('hello there'), 'application/pdf');
    assert.equal(text.json.error.code, 'UNSUPPORTED_IMPORT_FILE');
    const brokenZip = await importer.upload('POST', '/api/import/linkedin/file?name=export.zip', Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0]), 'application/zip');
    assert.equal(brokenZip.json.error.code, 'IMPORT_UNREADABLE');
    const otherZip = await importer.upload('POST', '/api/import/linkedin/file?name=photos.zip', Buffer.from(zipSync({ 'readme.txt': Buffer.from('hi') })), 'application/zip');
    assert.equal(otherZip.json.error.code, 'IMPORT_NOT_LINKEDIN');
    const brokenPdf = await importer.upload('POST', '/api/import/linkedin/file?name=x.pdf', Buffer.from('%PDF-1.4 broken'), 'application/pdf');
    assert.equal(brokenPdf.json.error.code, 'IMPORT_UNREADABLE');
    const otherPdf = await importer.upload(
      'POST',
      '/api/import/linkedin/file?name=x.pdf',
      (await import('./lib/make-pdf')).makePdf([{ text: 'Quarterly sales report', x: 72, y: 700, size: 14 }]),
      'application/pdf',
    );
    assert.equal(otherPdf.json.error.code, 'IMPORT_NOT_LINKEDIN');
  });

  await step('saving the reviewed import creates the profile, and it drives discovery', async () => {
    const saved = await importer.put('/api/profile', {
      ...baseProfile,
      ...importedDraft,
      fullName: 'Riley Stone',
      specialisation: '',
      aspirations: '',
      goals: [],
      lookingFor: ['collaborator'],
      completeOnboarding: true,
    });
    assert.equal(saved.status, 200);
    const profile = saved.json.user.profile;
    assert.equal(profile.experience.length, 3);
    assert.equal(profile.education.length, 1);
    assert.equal(profile.certifications.length, 1);

    // The imported skills and experience now decide who Riley sees.
    const deck = (await importer.get('/api/discovery')).json.people;
    const top = deck.slice(0, 6);
    assert.ok(top.filter((p: Json) => p.relevance.sharedSkills.length >= 1).length >= 4, 'the most relevant people share the imported skills');
    assert.ok(top.every((p: Json) => p.relevance.reasons.length >= 2));
    const diego = deck.find((p: Json) => p.profile.fullName === 'Diego Fernández');
    assert.ok(diego.relevance.reasons.some((r: Json) => r.kind === 'employer' && r.detail === 'Fernhill Automation'), 'imported work history becomes a relevance reason');
    assert.ok(top[0].relevance.score - deck.at(-1).relevance.score > 40);

    // And others see the imported information on Riley's card.
    const card = (await alex.get(`/api/users/${importerUser.id}`)).json.person;
    assert.equal(card.profile.headline, 'Robotics Engineer at Orbit Mechatronics | Mobile manipulation');
    assert.ok(card.relevance.sharedSkills.includes('ROS'));
  });

  // =====================================================================
  section('Flow C · Password reset');

  await step('asking for a reset never reveals whether the address is registered', async () => {
    const unknown = await stranger.post('/api/auth/forgot-password', { email: 'nobody@example.com' });
    const known = await stranger.post('/api/auth/forgot-password', { email: jordanEmail });
    assert.equal(unknown.status, 202);
    assert.deepEqual(unknown.json, known.json);
    assert.equal(emailsTo('nobody@example.com').length, 0);
  });

  await step('the reset email carries a single-use, expiring link', async () => {
    const email = lastEmail(jordanEmail, 'reset-password');
    assert.equal(email.subject, 'Reset your Nexly password');
    const token = linkToken(email);
    assert.deepEqual((await stranger.post('/api/auth/reset-password/check', { token })).json, { email: jordanEmail });
    assert.equal((await stranger.post('/api/auth/reset-password', { token, password: 'weak' })).status, 400);

    assert.equal((await jordan.get('/api/auth/me')).json.user.id, jordanId, 'still signed in before the reset');
    assert.equal((await stranger.post('/api/auth/reset-password', { token, password: 'second-pass-456' })).status, 200);
    assert.equal((await stranger.post('/api/auth/reset-password', { token, password: 'third-pass-789' })).json.error.code, 'TOKEN_USED');
    assert.equal((await stranger.post('/api/auth/reset-password/check', { token })).json.error.code, 'TOKEN_USED');

    assert.equal((await jordan.get('/api/auth/me')).json.user, null, 'every session is signed out');
    assert.equal((await new Client().post('/api/auth/login', { email: jordanEmail, password: jordanPassword })).status, 401);
    jordan = new Client();
    await jordan.login(jordanEmail, 'second-pass-456');
    assert.equal(lastEmail(jordanEmail, 'password-changed').subject, 'Your Nexly password was changed');
  });

  await step('expired and unknown reset links are refused', async () => {
    skipCooldown();
    await stranger.post('/api/auth/forgot-password', { email: jordanEmail });
    const token = linkToken(lastEmail(jordanEmail, 'reset-password'));
    db.exec("UPDATE email_tokens SET expires_at = '2020-01-01T00:00:00.000Z' WHERE purpose = 'reset_password'");
    assert.equal((await stranger.post('/api/auth/reset-password/check', { token })).json.error.code, 'TOKEN_EXPIRED');
    assert.equal((await stranger.post('/api/auth/reset-password', { token: 'y'.repeat(43), password: 'fourth-pass-000' })).json.error.code, 'TOKEN_INVALID');
  });

  // =====================================================================
  section('Settings, notifications and account management');

  await step('settings show where the account is signed in', async () => {
    const second = new Client();
    await second.login(jordanEmail, 'second-pass-456');
    const security = (await jordan.get('/api/account/security')).json;
    assert.equal(security.sessions.length, 2);
    assert.equal(security.sessions.filter((s: Json) => s.current).length, 1);
    assert.equal(security.sessions[0].device, 'Chrome on Windows');
    assert.ok(security.passwordChangedAt);

    const revoked = await jordan.post('/api/account/sessions/revoke-others');
    assert.equal(revoked.json.revoked, 1);
    assert.equal((await second.get('/api/auth/me')).json.user, null);
    assert.equal((await jordan.get('/api/auth/me')).json.user.id, jordanId);
  });

  await step('changing the password needs the current one and signs out other devices', async () => {
    const wrong = await jordan.post('/api/account/password', { currentPassword: 'not-it-12345', newPassword: 'final-pass-789' });
    assert.equal(wrong.status, 400);
    assert.ok(wrong.json.error.fields.currentPassword);
    const other = new Client();
    await other.login(jordanEmail, 'second-pass-456');
    assert.equal((await jordan.post('/api/account/password', { currentPassword: 'second-pass-456', newPassword: 'final-pass-789' })).status, 200);
    assert.equal((await other.get('/api/auth/me')).json.user, null);
    assert.equal((await jordan.get('/api/auth/me')).json.user.id, jordanId, 'this device stays signed in');
    await new Client().login(jordanEmail, 'final-pass-789');
  });

  await step('the name can be changed from settings', async () => {
    assert.equal((await jordan.put('/api/account/name', { fullName: 'Jordan A. Lee' })).json.user.profile.fullName, 'Jordan A. Lee');
    assert.equal((await jordan.put('/api/account/name', { fullName: '' })).status, 400);
  });

  await step('notification settings control in-app and email notifications', async () => {
    const defaults = (await jordan.get('/api/auth/me')).json.user.settings;
    assert.deepEqual(defaults, { discoverable: true, notifyRequests: true, notifyAccepted: true, emailRequests: true, emailAccepted: true });

    // With everything on, a request from Alex produces a notification and an email with the reasons.
    assert.equal((await alex.post('/api/connections', { targetId: jordanId })).status, 201);
    const email = lastEmail(jordanEmail, 'connection-request');
    assert.equal(email.subject, 'You have a new connection request from Alex Rivera');
    assert.match(email.html, /You have a new connection request/);
    assert.match(email.text, /Why you might connect: .*shared skill/);
    assert.ok((await jordan.get('/api/notifications')).json.items.some((n: Json) => n.type === 'connection_request' && n.actor.fullName === 'Alex Rivera'));

    // With them off, the request still arrives in Connections but nothing is announced.
    await jordan.put('/api/account/settings', { ...defaults, notifyRequests: false, emailRequests: false });
    const before = { emails: emailsTo(jordanEmail).length, notes: count('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ?', jordanId) };
    const sofia = new Client();
    await sofia.login('sofia@nexly.example', DEMO_PASSWORD);
    assert.equal((await sofia.post('/api/connections', { targetId: jordanId })).status, 201);
    assert.equal(emailsTo(jordanEmail).length, before.emails);
    assert.equal(count('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ?', jordanId), before.notes);
    assert.ok((await jordan.get('/api/connections')).json.incoming.some((p: Json) => p.profile.fullName === 'Sofia Lindqvist'));
    assert.equal((await jordan.put('/api/account/settings', { discoverable: 'yes' })).status, 400);
  });

  await step('a hidden profile leaves discovery and search but stays visible to its connections', async () => {
    const settings = (await jordan.get('/api/auth/me')).json.user.settings;
    await jordan.put('/api/account/settings', { ...settings, discoverable: false });
    const kenji = new Client();
    await kenji.login('kenji@nexly.example', DEMO_PASSWORD);
    assert.ok(!(await kenji.get('/api/discovery')).json.people.some((p: Json) => p.profile.userId === jordanId));
    assert.equal((await kenji.get('/api/search?q=jordan')).json.results.length, 0);
    assert.equal((await kenji.get(`/api/users/${jordanId}`)).status, 404);
    assert.equal((await kenji.post('/api/connections', { targetId: jordanId })).status, 404);
    assert.equal((await maya.get(`/api/users/${jordanId}`)).status, 200, 'an existing connection can still open the profile');
    await jordan.put('/api/account/settings', { ...settings, discoverable: true });
    assert.equal((await kenji.get(`/api/users/${jordanId}`)).status, 200);
  });

  await step('notifications can be marked read', async () => {
    const before = (await jordan.get('/api/notifications')).json;
    const first = before.items.find((n: Json) => !n.read);
    assert.equal((await jordan.post(`/api/notifications/${first.id}/read`)).json.unread, before.unread - 1);
    assert.equal((await maya.post(`/api/notifications/${first.id}/read`)).status, 404);
    assert.equal((await jordan.post('/api/notifications/read-all')).json.unread, 0);
  });

  await step('deleting an account needs confirmation and removes everything', async () => {
    const { client: leaver, user } = await signUp('Casey Leaver', 'casey@example.com', 'leaving-pass-1');
    await leaver.put('/api/profile', { ...baseProfile, fullName: 'Casey Leaver', completeOnboarding: true });
    const photo = (await leaver.upload('PUT', '/api/profile/photo', PNG, 'image/png')).json.user.profile.photoUrl as string;
    await leaver.post('/api/connections', { targetId: mayaId });
    assert.ok(count('SELECT COUNT(*) AS n FROM notifications WHERE actor_id = ?', user.id) > 0);

    assert.equal((await leaver.post('/api/account/delete', { password: 'wrong-pass-999' })).status, 400);
    assert.equal((await leaver.post('/api/account/delete', {})).status, 400);
    assert.equal((await leaver.post('/api/account/delete', { password: 'leaving-pass-1' })).status, 200);

    assert.equal((await leaver.get('/api/auth/me')).json.user, null);
    for (const table of ['users', 'profiles', 'sessions', 'password_credentials', 'user_settings', 'images', 'projects', 'profile_skills']) {
      const column = table === 'users' ? 'id' : 'user_id';
      assert.equal(count(`SELECT COUNT(*) AS n FROM ${table} WHERE ${column} = ?`, user.id), 0, `${table} is cleared`);
    }
    assert.equal(count('SELECT COUNT(*) AS n FROM connections WHERE requester_id = ?', user.id), 0);
    assert.equal(count('SELECT COUNT(*) AS n FROM notifications WHERE actor_id = ?', user.id), 0);
    assert.equal((await fetch(base + photo)).status, 404, 'uploaded files are deleted too');
    assert.equal(lastEmail('casey@example.com', 'account-deleted').subject, 'Your Nexly account has been deleted');
    assert.equal((await new Client().post('/api/auth/login', { email: 'casey@example.com', password: 'leaving-pass-1' })).status, 401);

    const demo = await maya.post('/api/account/delete', { password: DEMO_PASSWORD });
    assert.equal(demo.status, 400, 'the members that come with the app are protected');
  });

  // =====================================================================
  section('Email delivery and platform security');

  await step('the local inbox is readable in development, from this machine only', async () => {
    const mailbox = await stranger.get('/api/inbox');
    assert.equal(mailbox.status, 200);
    assert.ok(mailbox.json.emails.length >= 3);
    assert.ok(mailbox.json.emails[0].html.includes('<!doctype html>'));
    assert.deepEqual((await stranger.get('/api/auth/options')).json, { localInbox: true });
  });

  await step('real providers: the same email goes out over SMTP and over the Resend API', async () => {
    const message = { to: 'someone@example.com', subject: 'Reset your Nexly password', html: '<p>Hello</p>', text: 'Hello', template: 'reset-password' as const };
    const before = count('SELECT COUNT(*) AS n FROM dev_mailbox');

    Object.assign(config.email, { provider: 'smtp', from: 'Nexly <hello@nexly.test>', smtp: { host: 'localhost', port: smtpPort, secure: false, user: '', pass: '' } });
    await sendEmail(message);
    assert.equal(mock.smtp.length, 1);
    assert.match(mock.smtp[0], /Subject: Reset your Nexly password/);
    assert.match(mock.smtp[0], /To: someone@example\.com/);
    assert.match(mock.smtp[0], /From: Nexly <hello@nexly\.test>/);

    Object.assign(config.email, { provider: 'resend', resendApiKey: 're_test_key', resendApiUrl: `${mockBase}/resend` });
    await sendEmail(message);
    assert.equal(mock.resend[0].authorization, 'Bearer re_test_key');
    assert.deepEqual(mock.resend[0].body, { from: 'Nexly <hello@nexly.test>', to: ['someone@example.com'], subject: message.subject, html: message.html, text: message.text });

    // With a real provider, messages (and the link tokens inside them) are never stored locally.
    assert.equal(count('SELECT COUNT(*) AS n FROM dev_mailbox'), before);

    // A provider failure surfaces as a clear error rather than a silent success.
    Object.assign(config.email, { resendApiUrl: `${mockBase}/missing` });
    await assert.rejects(sendEmail(message), /Resend rejected the email/);
    skipCooldown();
    const failed = await stranger.post('/api/auth/forgot-password', { email: 'riley@example.com' });
    assert.equal(failed.status, 502);
    assert.equal(failed.json.error.code, 'EMAIL_NOT_SENT');
    Object.assign(config.email, { provider: 'dev' });
  });

  await step('there is one way in: email and password', async () => {
    const member = new Client();
    assert.equal((await member.post('/api/auth/login', { email: 'maya@nexly.example', password: DEMO_PASSWORD })).json.user.profile.fullName, 'Maya Okafor');
    for (const [method, route] of [
      ['POST', '/api/auth/demo-login'],
      ['GET', '/api/auth/demo-accounts'],
      ['GET', '/api/auth/google'],
      ['POST', '/api/import/linkedin/lookup'],
      ['POST', '/api/import/linkedin/sample'],
      ['GET', '/api/import/linkedin/capabilities'],
      ['POST', '/api/auth/signup/verify'],
      ['POST', '/api/auth/signup/complete'],
      ['POST', '/api/auth/signup/resend'],
    ] as const) {
      assert.equal((await member.request(method, route, method === 'POST' ? {} : undefined)).status, 404, `${route} does not exist`);
    }
  });

  await step('rejects cross-site and form-encoded writes', async () => {
    const crossSite = await jordan.request('POST', '/api/decisions', { targetId: 2, action: 'skip' }, { Origin: 'https://evil.example' });
    assert.equal(crossSite.status, 403);
    const form = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'email=a' });
    assert.equal(form.status, 415);
    assert.equal((await jordan.get('/api/nope')).status, 404);
  });

  await step('logs out', async () => {
    assert.equal((await jordan.post('/api/auth/logout')).status, 200);
    assert.equal((await jordan.get('/api/auth/me')).json.user, null);
    assert.equal((await jordan.get('/api/connections')).status, 401);
  });

  await step('throttles repeated failed logins', async () => {
    let last = 0;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      last = (await stranger.post('/api/auth/login', { email: 'elena@nexly.example', password: 'wrong-password-1' })).status;
    }
    assert.equal(last, 429);
  });

  console.log(`\nAll ${passed} checks passed.`);
} finally {
  server.close();
  mockServer.close();
  smtpServer.close();
  db.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
}
