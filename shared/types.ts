import type { ConnectionTypeId, SearchScope, SortOption } from './constants';

// ---------- Profiles ----------

export interface Project {
  id?: number;
  title: string;
  description: string;
  type: string;
  role: string;
  year: number | null;
  url: string;
  skills: string[];
  /** Cover image uploaded by the owner, or null. */
  imageUrl: string | null;
}

/** A role held. Dates are '', 'YYYY' or 'YYYY-MM'; an empty end date means the role is current. */
export interface Experience {
  id?: number;
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface Education {
  id?: number;
  school: string;
  degree: string;
  field: string;
  startYear: number | null;
  endYear: number | null;
}

export interface Certification {
  id?: number;
  name: string;
  issuer: string;
  year: number | null;
}

/** The editable part of a profile: what the profile form sends to the API. */
export interface ProfileInput {
  fullName: string;
  /** A one-line professional summary, as on a LinkedIn headline. */
  headline: string;
  profession: string;
  workplace: string;
  specialisation: string;
  location: string;
  about: string;
  aspirations: string;
  linkedinUrl: string;
  skills: string[];
  interests: string[];
  goals: string[];
  lookingFor: ConnectionTypeId[];
  projects: Project[];
  experience: Experience[];
  education: Education[];
  certifications: Certification[];
}

export interface Profile extends ProfileInput {
  userId: number;
  photoUrl: string | null;
  onboarded: boolean;
  joinedAt: string;
  updatedAt: string;
}

export interface CompletionItem {
  key: string;
  label: string;
  hint: string;
  weight: number;
  done: boolean;
}

export interface Completion {
  percent: number;
  items: CompletionItem[];
}

// ---------- Relevance ----------

export type RelevanceReasonKind =
  | 'incoming'
  | 'skills'
  | 'interests'
  | 'complementary'
  | 'intent'
  | 'project'
  | 'field'
  | 'goals'
  | 'specialisation'
  | 'workplace'
  | 'employer'
  | 'school';

export interface RelevanceReason {
  kind: RelevanceReasonKind;
  label: string;
  detail?: string;
}

export type RelevanceTier = 'high' | 'good' | 'possible' | 'low';

export interface Relevance {
  /** 0–100 relevance score. */
  score: number;
  tier: RelevanceTier;
  reasons: RelevanceReason[];
  sharedSkills: string[];
  sharedInterests: string[];
  sharedGoals: string[];
  complementarySkills: string[];
  relevantProjects: string[];
}

// ---------- Connections ----------

export type ConnectionStatus = 'self' | 'none' | 'pending_sent' | 'pending_received' | 'declined_by_me' | 'connected';

export interface ConnectionRef {
  id: number | null;
  status: ConnectionStatus;
  since: string | null;
}

/** A profile as seen by the signed-in viewer: the profile plus relevance and connection state. */
export interface Person {
  profile: Profile;
  relevance: Relevance;
  connection: ConnectionRef;
  /** Only present once the two users are connected. */
  contactEmail?: string;
}

export interface ConnectionsOverview {
  incoming: Person[];
  sent: Person[];
  accepted: Person[];
}

export type ConnectOutcome = 'requested' | 'connected' | 'already_pending' | 'already_connected';

export interface ConnectResult {
  outcome: ConnectOutcome;
  person: Person;
}

// ---------- Discovery ----------

export interface DiscoveryFilters {
  profession: string;
  workplace: string;
  specialisation: string;
  skills: string[];
  interests: string[];
  goals: string[];
  projectType: string;
  lookingFor: ConnectionTypeId | '';
  sort: SortOption;
}

export interface DiscoveryStats {
  /** Profiles still unseen, ignoring filters. */
  remaining: number;
  reviewedToday: number;
  skipped: number;
  requestsSent: number;
  connections: number;
}

export interface DiscoveryResponse {
  people: Person[];
  /** Profiles that pass the current filters. */
  total: number;
  stats: DiscoveryStats;
}

/** The result of pressing Connect or Skip on a profile. */
export interface DecisionResult {
  action: 'connect' | 'skip';
  outcome: ConnectOutcome | 'skipped';
  person: Person;
  stats: DiscoveryStats;
}

export interface UndoResult {
  action: 'connect' | 'skip';
  person: Person;
  stats: DiscoveryStats;
}

// ---------- Notifications ----------

export type NotificationType = 'connection_request' | 'connection_accepted' | 'welcome';

export interface NotificationItem {
  id: number;
  type: NotificationType;
  read: boolean;
  createdAt: string;
  connectionId: number | null;
  actor: { userId: number; fullName: string; profession: string; photoUrl: string | null } | null;
  /** Current state of the related request, so the UI can offer the right action. */
  connectionStatus: ConnectionStatus | null;
}

export interface NotificationsResponse {
  items: NotificationItem[];
  unread: number;
}

// ---------- Search ----------

export interface SearchResult extends Person {
  foundIn: string[];
}

export interface SearchResponse {
  query: string;
  scope: SearchScope;
  results: SearchResult[];
}

// ---------- Dashboard ----------

export interface SuggestedAction {
  id: string;
  title: string;
  description: string;
  href: string;
  cta: string;
}

export interface DashboardResponse {
  recommended: Person[];
  incoming: Person[];
  incomingCount: number;
  recentConnections: Person[];
  notifications: NotificationItem[];
  unreadNotifications: number;
  completion: Completion;
  stats: DiscoveryStats;
  actions: SuggestedAction[];
}

// ---------- Accounts ----------

export interface UserSettings {
  /** Whether the profile appears in other members' discovery decks and search results. */
  discoverable: boolean;
  /** In-app notifications. */
  notifyRequests: boolean;
  notifyAccepted: boolean;
  /** Email notifications. */
  emailRequests: boolean;
  emailAccepted: boolean;
}

export interface SessionUser {
  id: number;
  email: string;
  /** One of the members that come with the app. These accounts cannot be deleted. */
  isSeeded: boolean;
  createdAt: string;
  profile: Profile;
  completion: Completion;
  settings: UserSettings;
}

/** The answer to "who am I?", together with what the app needs to know about the server answering. */
export interface SessionResponse {
  user: SessionUser | null;
  /** The API version this server runs (see API_VERSION). */
  api: number;
  /** True when the server's code has changed since this process started, so it needs a restart. */
  restartNeeded: boolean;
}

/** What the sign-in pages need to know about this server. */
export interface AuthOptions {
  /** True when emails are kept in the local inbox on this computer instead of being sent out. */
  localInbox: boolean;
}

export interface SessionInfo {
  id: number;
  current: boolean;
  /** A short description such as "Chrome on Windows". */
  device: string;
  createdAt: string;
  lastSeenAt: string | null;
}

export interface SecurityOverview {
  sessions: SessionInfo[];
  passwordChangedAt: string | null;
}

export interface InboxEmail {
  id: number;
  to: string;
  subject: string;
  html: string;
  text: string;
  template: string;
  createdAt: string;
}

export interface Meta {
  skills: string[];
  interests: string[];
  goals: string[];
  professions: string[];
  workplaces: string[];
  specialisations: string[];
}

// ---------- LinkedIn import ----------

export type ImportableField =
  | 'fullName'
  | 'headline'
  | 'profession'
  | 'workplace'
  | 'location'
  | 'about'
  | 'skills'
  | 'interests'
  | 'experience'
  | 'education'
  | 'projects'
  | 'certifications';

/** What was read from a member's LinkedIn profile PDF. Nothing is saved until they confirm it. */
export interface LinkedInImportResult {
  /** The name of the uploaded file, for the confirmation shown above the review. */
  fileName: string;
  /** The details that were read, already mapped onto Nexly's profile fields. */
  draft: Partial<ProfileInput>;
  /** Which fields were filled in. Everything else is left for the member to add. */
  imported: ImportableField[];
  /** Things worth knowing about this import, e.g. that a long About text was shortened. */
  notes: string[];
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}
