# Nexly

**Find the right people, without opening a hundred profiles.**

Nexly is a professional network discovery platform. Instead of opening long
profiles one by one, you get a short stack of concise profile cards, ranked by
how relevant each person is to you. Press **Skip** to move on, or **Connect** to
send a connection request; the other person is notified straight away.

It is a complete, working application: a React front end, an Express API, a
SQLite database, email-and-password accounts, LinkedIn import from a PDF or a
data export, image uploads, a relevance engine, and a starting set of member
profiles so there are people to discover from the first minute.

---

## Quick start

You need **Node.js 22.13 or newer** (24 recommended). Nothing else: the database
is a file, and SQLite ships inside Node.

```bash
npm install
npm run dev
```

Open <http://localhost:4000>. On first start the database is created with 34
member profiles. A database from an earlier version is upgraded in place; no
data is lost.

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the app (API + UI) on one port |
| `npm run dev:watch` | Same, and restarts the server when server code changes (run it in a normal terminal) |
| `npm run build` | Builds the production front end into `dist/` |
| `npm start` | Serves the production build and the API (run `npm run build` first) |
| `npm run seed` | Wipes the database and uploads, then reloads the starting profiles |
| `npm run typecheck` | Type-checks the client and the server |
| `npm run test:e2e` | Runs 44 end-to-end checks against a throwaway database |
| `npm run email:test -- you@example.com` | Sends one email through the configured provider |
| `npx tsx scripts/check-upgrade.ts` | Checks that a version 1 database upgrades cleanly |
| `npx tsx scripts/ranking.ts alex` | Prints one member's discovery ranking with the reasons |

After changing server code or `.env`, stop the server (`Ctrl+C`) and start it
again. Only one copy can run at a time: a second start on the same port stops
with a message instead of touching the database.

## Email

An account is created with a name, an email address and a password; the email
address is only what the member logs in with. Nexly sends email for password
resets, connection requests and account notices. Copy `.env.example` to `.env` to connect a provider. `.env` is
ignored by git; no secret is stored in the code or sent to the browser.

### Gmail

1. In the Google account that will send the email, turn on **2-Step Verification**: <https://myaccount.google.com/signinoptions/two-step-verification>
2. Create an **app password**: <https://myaccount.google.com/apppasswords> (name it "Nexly"). Google shows 16 characters.
3. Put both in `.env`:

   ```
   GMAIL_USER=your.address@gmail.com
   GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
   ```

4. Check it:

   ```bash
   npm run email:test -- your.address@gmail.com
   ```

   It signs in to Gmail, sends one message and tells you what to fix if Gmail
   refuses.
5. Restart `npm run dev`. The startup log prints `Email: connected and signed in`.

Your normal Google password does not work here; Google only accepts an app
password for SMTP. Any other SMTP server (`SMTP_HOST`, …) or
[Resend](https://resend.com) (`RESEND_API_KEY`) can be used instead.

### Before a provider is connected

Emails are kept in an inbox page on the same computer, at <http://localhost:4000/inbox>.
The password-reset screen links to it, so a reset can be completed.
The page only exists in development, only on the computer running the server,
and disappears once a provider is connected.

If an email cannot be delivered, the app says so rather than reporting success.

## Environment variables

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `4000` | Port for the web and API server |
| `APP_URL` | `http://localhost:<PORT>` | Public address, used in email links |
| `DATA_DIR` | `data` | Folder for the SQLite database and uploaded images |
| `DEMO_MODE` | `true` | Add the starting member profiles when the database is first created |
| `SESSION_DAYS` | `14` | How long a login lasts |
| `COOKIE_SECURE` | `true` when `APP_URL` is https | Marks the session cookie `Secure` |
| `EMAIL_PROVIDER` | auto | `gmail`, `smtp`, `resend` or `dev` (the inbox page) |
| `EMAIL_FROM` | the Gmail address | Sender shown on emails |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | – | Gmail address and its app password |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | – | Any other SMTP server |
| `RESEND_API_KEY` | – | Resend API key |

## The starting members

The 34 profiles that come with the app are fictional people at fictional
companies, with generated illustrations for photos. They can be signed in to
like any other account, which is how to see both sides of a connection request:

- **Email:** `<first name>@nexly.example`, for example `alex@nexly.example` or `maya@nexly.example`
- **Password:** the `DEMO_PASSWORD` constant in [`server/db/seed.ts`](server/db/seed.ts)

| Member | Who they are | Good for showing |
| --- | --- | --- |
| Alex Rivera | Robotics software engineer | Incoming requests, existing connections, a robotics-ranked list |
| Maya Okafor | Mechanical design engineer | Highly relevant to Alex: press Connect on her as Alex |
| Elena Rossi | Product designer | A completely different ranking (design, product) |
| Daniel Osei | Startup founder | Investors and co-founders ranked first |

These addresses cannot receive email, so Nexly never sends to them, and these
accounts cannot be deleted. `npm run seed` puts everything back to its starting
state.

## A five-minute walkthrough

1. **Landing page** – open <http://localhost:4000> and press Connect or Skip on the preview card.
2. **Create an account** – *Create profile*, enter a name, email and password. You are signed in straight away.
3. **Log out and back in** – the same email and password log you in. *Forgot password?* emails a reset link.
4. **Import your LinkedIn profile** – choose *Import from LinkedIn* and upload your LinkedIn PDF (LinkedIn → your profile → *Resources* → *Save to PDF*) or your data export ZIP (*Settings* → *Data privacy* → *Get a copy of your data*). [`samples/`](samples) holds a fictional PDF and ZIP to try.
5. **Review your profile** – check what was imported, complete the rest, add a photo, then *Create profile*.
6. **Discover** – each card shows why the person is relevant. Use **Previous**, **Skip**, **Connect** and **Next** (or `←` `→` `S` `C`; `U` undoes, `I` opens the full profile). Open *Filters* to narrow the list.
7. **Send a request** – press Connect. "Connection request sent" is confirmed and the *Requests awaiting a reply* counter goes up.
8. **Switch member** – log out, then log in as the person you sent the request to.
9. **Accept** – the bell and the Connections tab show a badge: "You have a new connection request". Press *Accept*.
10. **Back to the first account** – a "Connection request accepted" notification is waiting, and the contact details are now visible.
11. **Settings** – change your name or password, hide your profile, choose which emails you get, sign out other devices, or delete the account.

## Features

- **Accounts** – create an account with a name, email and password (strength indicator, show/hide, confirmation); log in; log out; password reset by email with expiring single-use links
- **Transactional email** – password reset, password changed, new connection request, connection request accepted, account deleted; HTML and plain-text versions
- **LinkedIn import** – upload a LinkedIn profile PDF or data export ZIP, review what was read on one screen, complete the rest, and confirm (see [LinkedIn import](#linkedin-import))
- **Profiles** – headline, profession, current work, specialisation, location, about, skills, interests, experience, education, certifications, projects with images, career goals and who you want to meet, with a live profile-strength meter
- **Image uploads** – drag and drop or file picker, preview, crop and zoom, progress, type and size checks, replace and remove; files live on disk behind a storage interface, not in the database
- **Discovery** – ranked cards with **Connect**, **Skip**, **Previous** and **Next** buttons, full keyboard support, undo, filters and sorting
- **Relevance engine** – a scoring model with visible reasons on every card (see [How relevance is calculated](#how-relevance-is-calculated))
- **Connections** – incoming requests, accepted connections and sent requests; accept, decline, withdraw, remove
- **Notifications** – persisted, with unread badges, a dropdown, a full page, mark-as-read, and inline accept / decline
- **Search** – by name, profession, headline, skill, interest, workplace, experience, education or project, with a note on where the term was found
- **Settings** – account, profile visibility, notification and email preferences, signed-in devices, delete account
- **Dashboard** – recommendations, pending requests, recent connections, notifications, profile strength and suggested next steps
- **Responsive and accessible** – phone to desktop; keyboard operable; labelled controls; visible focus; live announcements; reduced-motion support
- **Loading, empty and error states** on every page

## Technology

| Layer | Choice | Why |
| --- | --- | --- |
| UI | React 19, TypeScript, React Router | Component model and typed data all the way to the API |
| Build | Vite | Fast dev server; mounted inside the API server so there is one port |
| Styling | Plain CSS with design tokens | A small, consistent design system with no framework to configure |
| API | Express 5 | Small and well understood |
| Database | SQLite through Node's built-in `node:sqlite` | A real relational database with no install step and no native build |
| Validation | Zod | One schema validates every request on the server |
| Passwords | scrypt from `node:crypto` | Salted, memory-hard hashing with no extra dependency |
| Email | nodemailer (SMTP / Gmail) or the Resend HTTP API | Standard, provider-independent delivery |
| Import | unpdf (PDF text), fflate (ZIP) | Read the two files LinkedIn gives its members |
| Icons, type | lucide-react; Inter and Bricolage Grotesque (bundled, no network needed) | |

The front end and the API share TypeScript types and constants from `shared/`.

## Project structure

```
Nexly/
├── index.html               Vite entry page
├── .env.example             Every setting, with notes
├── shared/                  Used by both client and server
│   ├── constants.ts         Connection types, project types, limits, URL rules
│   ├── types.ts             API request / response types
│   └── completion.ts        Profile-strength calculation
├── server/
│   ├── index.ts             Entry point: migrations, starting data, API, front end
│   ├── app.ts               Express app and middleware order
│   ├── config.ts            Environment settings (the only place secrets are read)
│   ├── db/
│   │   ├── migrations/      Numbered SQL migrations, applied in order
│   │   ├── migrate.ts       Applies pending migrations
│   │   ├── seed.ts          Loads the starting profiles (also `npm run seed`)
│   │   └── seed-data.ts     The 34 fictional members and their activity
│   ├── email/               Mailer (Gmail / SMTP / Resend / local inbox) and templates
│   ├── storage/             Where uploaded files are kept (local disk driver)
│   ├── lib/                 Password hashing, tokens, errors, field taxonomy
│   ├── middleware/          Sessions and guards, security headers, CSRF, rate limits, errors
│   ├── validation/          Zod schemas for every request
│   ├── services/            Business logic
│   │   ├── auth.service.ts          Sign-up, sessions, password reset, settings, deletion
│   │   ├── linkedin/                Reads a LinkedIn PDF or data export and maps it onto the profile fields
│   │   ├── image.service.ts         Photo and project-image uploads, ownership, clean-up
│   │   ├── profile.service.ts       Profiles, tags, experience, education, projects
│   │   ├── relevance.service.ts     The relevance score and its reasons
│   │   ├── discovery.service.ts     The ranked list, filters, connect / skip decisions, undo
│   │   ├── connection.service.ts    Requests, accept / decline / remove
│   │   ├── connection-events.ts     Notifications and emails for requests
│   │   ├── notification.service.ts  Notifications and unread counts
│   │   ├── search.service.ts        People search
│   │   ├── dashboard.service.ts     The dashboard summary
│   │   └── people.service.ts        Adds relevance + connection state to profiles
│   └── routes/              HTTP routes (thin: validate, call a service, respond)
├── src/                     The React app
│   ├── main.tsx, App.tsx    Bootstrapping and routes (with route guards)
│   ├── api/                 Typed API client (JSON and file uploads with progress)
│   ├── context/             Auth, toasts, notification polling
│   ├── hooks/               Data fetching and small utilities
│   ├── components/
│   │   ├── ui/              Buttons, fields, tag input, modal, tabs, avatar, states
│   │   ├── layout/          App shell, public header and footer, auth layout
│   │   ├── auth/            Password fields with strength meter, "check your inbox"
│   │   ├── discovery/       Profile card, action buttons, filters, connected dialog
│   │   ├── profile/         Person card, full profile, relevance reasons, connection buttons
│   │   ├── editor/          Profile form sections, uploads, LinkedIn import and review
│   │   └── notifications/   Notification row
│   ├── pages/               One file per screen
│   ├── styles/              Design tokens and stylesheets
│   └── utils/               Formatting, password and image helpers
├── samples/                 A fictional LinkedIn profile PDF and data export for trying the import
├── scripts/                 End-to-end checks, upgrade check, email test, ranking printer
└── data/                    Created at runtime: the database and uploads (not committed)
```

## Data model

Defined by the migrations in [`server/db/migrations`](server/db/migrations).

| Table | Purpose |
| --- | --- |
| `users` | Identity: unique email (case-insensitive) |
| `password_credentials` | The password hash, kept apart from the user row |
| `email_tokens` | Hashed password-reset tokens with expiry and single use |
| `sessions` | Hashed session tokens with device and last-seen time |
| `user_settings` | Profile visibility and notification preferences |
| `profiles` | One per user: name, headline, profession, workplace, specialisation, location, about, aspirations, photo |
| `experiences`, `education`, `certifications` | Career history |
| `skills`, `interests`, `goals` and their link tables | Tag vocabularies and who has which |
| `profile_looking_for` | The kinds of people a member wants to meet |
| `projects`, `project_skills` | Projects, their images and the skills used |
| `images` | Every uploaded file and who owns it |
| `decisions` | Each Connect or Skip, one row per (viewer, person) |
| `connections` | A request that is `pending`, `accepted` or `declined` |
| `notifications` | Request and acceptance notifications with read state |
| `dev_mailbox` | The emails shown on the inbox page while no provider is connected |

Integrity is enforced by the database, not only by application code: unique
emails, one connection row per pair of people in either direction, no
self-connections, one decision per pair, `CHECK` constraints on every status and
type, and foreign keys with `ON DELETE CASCADE`.

## How relevance is calculated

The ranking is computed in [`server/services/relevance.service.ts`](server/services/relevance.service.ts).
Nothing is random. Each candidate earns points from these signals:

| Signal | Max | How it is measured |
| --- | --- | --- |
| Shared skills | 30 | Skills you both list |
| Shared interests | 18 | Interests you both list |
| Related field | 14 | How similar the two profiles' mix of fields is (headline, experience and education included) |
| Complementary intent | 12 | You want a mentor and they want mentees; you both want a co-founder; and so on |
| Complementary skills | 9 | Skills they have and you lack, inside the fields you are interested in |
| Relevant projects | 9 | Their projects that use your skills or are about your interests |
| Shared career goals | 8 | Goals you both list |

There are small bonuses for a shared specialisation, the same current workplace,
a past employer in common, the same school, and for people who have already sent
you a connection request (they are shown first so you can answer).

"Related field" and "complementary skills" rely on a small knowledge map in
[`server/lib/taxonomy.ts`](server/lib/taxonomy.ts) that groups tags into fields
(robotics, software, AI, design, product, finance and so on) and records which
fields are neighbours.

The total is passed through a saturating curve to give the 0–100 score on the
card. The curve only changes how the number reads; it never changes the order.
Every signal that fired is returned to the UI as a reason, shown under "Why
you're seeing …". Details imported from LinkedIn land in the same profile
fields, so they feed the ranking exactly like hand-typed ones.

## Connection rules

- **Skip** – recorded; that person is not shown again. "Review skipped profiles" (shown when the list is finished) brings them back.
- **Connect** – recorded, creates a `pending` connection request, a notification and (if they want them) an email for the other person. Sending twice is impossible.
- **Connect on someone who already sent you a request** – the button reads *Accept*; it accepts their request and notifies them.
- **Previous / Next** – move through the list without deciding.
- **Undo** – reverses your most recent Connect or Skip. Undoing a Connect withdraws the request and its notification. An accepted connection is removed from the Connections page instead.
- **Decline** – private. The sender is not notified.
- **Contact details** – a member's email is only ever sent to people they are connected with.

## LinkedIn import

A member uploads one of the two files LinkedIn gives them:

| File | Where it comes from | What is read |
| --- | --- | --- |
| **Profile PDF** | LinkedIn → your profile → *Resources* → *Save to PDF* | Name, headline, location, about, experience, education, top skills, certifications |
| **Data export ZIP** | LinkedIn → *Settings* → *Data privacy* → *Get a copy of your data* | Everything above plus the full skills list, projects and interests |

Either file is mapped onto Nexly's profile fields by one mapping layer
([`server/services/linkedin/mapper.ts`](server/services/linkedin/mapper.ts)).

The **Review your profile** screen then has two parts. *Information imported
from LinkedIn* shows what was filled in and lets the member edit or remove
items. *Complete your profile* offers editable fields for everything else, such
as specialisation, interests, projects, career aspirations and goals, and the
kinds of people they want to meet. Nothing is saved until the member presses
*Create profile* (or *Save changes* when importing into an existing profile).

## Security

- Passwords are hashed with **scrypt** and a per-user random salt, stored apart from the user row, and never logged or returned.
- Password-reset tokens are random, stored only as SHA-256 hashes, expire after 30 minutes, and work once.
- "Forgot password" answers the same way whether or not an account exists, so it cannot be used to find out who is registered.
- Sessions are random 256-bit tokens in an `HttpOnly`, `SameSite=Lax` cookie; only the hash is stored. Changing or resetting a password signs out other devices.
- **Authorisation**: the user id always comes from the session, never from the request. A member can only change their own profile, photo and project images; only the recipient of a request can answer it.
- **Uploads** are checked by size and by their actual file signature (not the name), stored outside the database under random names, and tied to their owner.
- **Server-side validation** of every request with Zod, with database constraints behind it; every query uses bound parameters.
- **CSRF**: state-changing requests must be same-origin and not form-encoded, in addition to the `SameSite` cookie.
- **Rate limiting** on sign-up, log-in, password and reset endpoints, plus a cooldown between reset emails to one address.
- Secrets are read only from the environment on the server; none reach the browser.

## Testing

`npm run test:e2e` starts the real server against a temporary database and runs
44 checks: creating an account and logging in; password reset (expiry, single
use); LinkedIn import from a PDF and from a data export ZIP; image uploads and
ownership; ranking with imported data; Connect, Skip and undo; duplicate
protection; notifications and emails; settings; account deletion; CSRF and rate
limiting. Email delivery over SMTP and Resend is exercised against local
stand-ins that follow each service's protocol.

## Notes

- **The PDF reader** works from the layout of LinkedIn's "Save to PDF" file. A PDF holds text without structure, so an unusual profile can put a line in the wrong place; the review screen is where that is corrected.
- **Gmail** accepts about 500 messages a day from a personal account.
- **Notifications** update by polling every 12 seconds and whenever you return to the tab.
- **Scale**: ranking scores every eligible member on each request, which suits tens or hundreds of members. A larger deployment would pre-compute candidates and move uploads to object storage (the storage interface is ready for that).
