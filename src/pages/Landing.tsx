import {
  ArrowRight,
  BellRing,
  Files,
  Filter,
  MousePointerClick,
  IdCard,
  Keyboard,
  Layers,
  Link2,
  ListChecks,
  ScanSearch,
  Sparkles,
  Timer,
  UserPlus,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Person } from '../../shared/types';
import { DeckCard } from '../components/discovery/DeckCard';
import { Footer, PublicHeader } from '../components/layout/PublicLayout';
import { buttonClass } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { LANDING_SAMPLES } from '../data/landingSamples';
import { firstName } from '../utils/format';
import { usePageTitle } from '../hooks/usePageTitle';

const PROBLEMS = [
  {
    icon: Files,
    title: 'Too many profiles',
    text: 'Professional networks hold an enormous number of people. Finding the few who matter to you means wading through the many who do not.',
  },
  {
    icon: Timer,
    title: 'Too much reading',
    text: 'To judge one person you open a full profile, scroll, and read. Do that fifty times and an evening is gone.',
  },
  {
    icon: ScanSearch,
    title: 'Too little signal',
    text: 'Search results rarely say why someone is relevant, so every profile has to be worked out from scratch.',
  },
];

const STEPS = [
  {
    icon: IdCard,
    title: 'Build your profile',
    text: 'Add your profession, skills, interests, projects and goals, and say who you want to meet. Start from a blank form or import it from LinkedIn.',
  },
  {
    icon: Layers,
    title: 'Get a ranked stack of cards',
    text: 'Nexly scores every member against your profile and shows the most relevant first, each on one concise card with the reasons spelled out.',
  },
  {
    icon: MousePointerClick,
    title: 'Decide with one click',
    text: 'Press Skip to move on, or Connect to send a connection request. The other person is notified straight away, and when they accept, you are connected.',
  },
];

const FEATURES = [
  {
    icon: Sparkles,
    title: 'Relevance you can see',
    text: 'Every card explains itself: shared skills, shared interests, related fields, relevant projects and common goals.',
  },
  {
    icon: ListChecks,
    title: 'Cards, not pages',
    text: 'Name, role, specialisation, skills and a project. Enough to decide in seconds, with the full profile one tap away.',
  },
  {
    icon: Filter,
    title: 'Filters that narrow fast',
    text: 'Focus the stack by profession, skill, interest, specialisation, workplace, career goal, project type or the kind of person you need.',
  },
  {
    icon: BellRing,
    title: 'Requests that reach people',
    text: 'Pressing Connect creates a real connection request and a notification, by email too. Accept or decline from the bell, the page or the card.',
  },
  {
    icon: Link2,
    title: 'A head start from LinkedIn',
    text: 'Upload your LinkedIn PDF or data export, review everything on one screen, and confirm before it goes live.',
  },
  {
    icon: Keyboard,
    title: 'Clear buttons, full keyboard support',
    text: 'Connect, Skip, Previous and Next are plain buttons that work with a mouse, a touchscreen or the keyboard. Undo is always one step away.',
  },
];

function HeroDemo() {
  const [index, setIndex] = useState(0);
  const [note, setNote] = useState('Try it: press Connect or Skip.');
  const person: Person = LANDING_SAMPLES[index % LANDING_SAMPLES.length];

  const decide = (action: 'connect' | 'skip') => {
    const name = firstName(person.profile.fullName);
    setNote(
      action === 'connect'
        ? `In the app, a connection request would now be sent to ${name}.`
        : `Skipped. In the app, ${name} would not be shown to you again.`,
    );
    // Cycle the cards so the preview never runs out.
    setIndex((value) => value + 1);
  };

  return (
    <div className="hero-demo" id="preview">
      <div className="hero-demo__glow" aria-hidden />
      <div className="deck">
        <div key={index} className="deck__card is-entering-forward">
          <DeckCard person={person} />
        </div>
      </div>
      <div className="deck-actions">
        <button type="button" className="btn btn--secondary btn--lg deck-actions__skip" onClick={() => decide('skip')}>
          <X aria-hidden />
          Skip
        </button>
        <button type="button" className="btn btn--primary btn--lg deck-actions__connect" onClick={() => decide('connect')}>
          <UserPlus aria-hidden />
          Connect
        </button>
      </div>
      <p className="hero-demo__note" role="status">
        {note}
      </p>
    </div>
  );
}

export function Landing() {
  usePageTitle();
  const { user } = useAuth();
  const discoverTarget = user ? (user.profile.onboarded ? '/discover' : '/onboarding') : '/login';
  const createTarget = user ? (user.profile.onboarded ? '/profile/edit' : '/onboarding') : '/signup';

  return (
    <div className="landing">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <PublicHeader />

      <main id="main">
        <section className="hero container">
          <div className="hero__copy">
            <p className="hero__pill">
              <Sparkles aria-hidden />
              Professional discovery, ranked for you
            </p>
            <h1>
              Find the right people, <em>without opening a hundred profiles.</em>
            </h1>
            <p className="hero__lead">
              Nexly turns professional networking into a short stack of concise profile cards, ordered by how relevant each person is to you.
              Press Connect to send a request, or Skip to move on.
            </p>
            <div className="hero__actions">
              <Link to={createTarget} className={buttonClass({ variant: 'primary', size: 'lg' })}>
                Create profile
                <ArrowRight aria-hidden />
              </Link>
              <Link to={discoverTarget} className={buttonClass({ variant: 'secondary', size: 'lg' })}>
                Start discovering
              </Link>
            </div>
          </div>
          <HeroDemo />
        </section>

        <section className="section container" id="problem" aria-labelledby="problem-title">
          <header className="section__head">
            <p className="eyebrow">The problem</p>
            <h2 id="problem-title">Networking should not feel like research.</h2>
            <p>
              Finding a collaborator, a mentor or a project partner usually means opening profile after profile and reading each one before
              you find someone relevant.
            </p>
          </header>
          <ul className="tile-grid">
            {PROBLEMS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="tile tile--plain">
                <span className="tile__icon tile__icon--coral">
                  <Icon aria-hidden />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="section section--band" id="how-it-works" aria-labelledby="how-title">
          <div className="container">
            <header className="section__head">
              <p className="eyebrow">How it works</p>
              <h2 id="how-title">From sign-up to a new connection in three steps.</h2>
            </header>
            <ol className="steps">
              {STEPS.map(({ icon: Icon, title, text }, index) => (
                <li key={title} className="step">
                  <span className="step__number" aria-hidden>
                    {index + 1}
                  </span>
                  <span className="tile__icon">
                    <Icon aria-hidden />
                  </span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="section container" id="features" aria-labelledby="features-title">
          <header className="section__head">
            <p className="eyebrow">Features</p>
            <h2 id="features-title">Everything is built to shorten the search.</h2>
          </header>
          <ul className="tile-grid">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="tile">
                <span className="tile__icon">
                  <Icon aria-hidden />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="container">
          <div className="cta-band">
            <div>
              <h2>Meet the people worth meeting.</h2>
              <p>Create your profile in a few minutes and see who Nexly ranks first for you.</p>
            </div>
            <div className="cta-band__actions">
              <Link to={createTarget} className={buttonClass({ variant: 'secondary', size: 'lg' })}>
                Create profile
              </Link>
              <Link to={discoverTarget} className="cta-band__link">
                Start discovering
                <ArrowRight aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
