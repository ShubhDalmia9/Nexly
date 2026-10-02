import type { ConnectionRef, Relevance, Person, Profile } from '../../shared/types';
import { all } from '../db/connection';
import { extractFeatures, scoreRelevance } from './relevance.service';
import { getProfile } from './profile.service';

export interface ConnectionRow {
  id: number;
  requester_id: number;
  addressee_id: number;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  responded_at: string | null;
}

const NO_RELEVANCE: Relevance = {
  score: 0,
  tier: 'low',
  reasons: [],
  sharedSkills: [],
  sharedInterests: [],
  sharedGoals: [],
  complementarySkills: [],
  relevantProjects: [],
};

/** Every connection row involving the viewer, keyed by the other user's id. */
export function connectionsOf(viewerId: number): Map<number, ConnectionRow> {
  const rows = all<ConnectionRow>(
    'SELECT * FROM connections WHERE requester_id = ?1 OR addressee_id = ?1',
    viewerId,
  );
  return new Map(rows.map((row) => [row.requester_id === viewerId ? row.addressee_id : row.requester_id, row]));
}

/**
 * Translates a connection row into what the viewer should see. A declined
 * request still reads as "pending" to the person who sent it, so declining
 * stays private.
 */
export function connectionRef(row: ConnectionRow | undefined, viewerId: number): ConnectionRef {
  if (!row) return { id: null, status: 'none', since: null };
  const sentByViewer = row.requester_id === viewerId;
  if (row.status === 'accepted') return { id: row.id, status: 'connected', since: row.responded_at ?? row.created_at };
  if (row.status === 'pending') {
    return { id: row.id, status: sentByViewer ? 'pending_sent' : 'pending_received', since: row.created_at };
  }
  return { id: row.id, status: sentByViewer ? 'pending_sent' : 'declined_by_me', since: row.created_at };
}

/** Wraps profiles with the viewer-specific relevance and connection state. */
export function buildPeople(
  viewerId: number,
  profiles: Profile[],
  shared: { viewer?: Profile; connections?: Map<number, ConnectionRow> } = {},
): Person[] {
  const viewer = extractFeatures(shared.viewer ?? getProfile(viewerId));
  const connections = shared.connections ?? connectionsOf(viewerId);

  const connectedIds = profiles
    .filter((profile) => connections.get(profile.userId)?.status === 'accepted')
    .map((profile) => profile.userId);
  const emails = new Map(
    connectedIds.length === 0
      ? []
      : all<{ id: number; email: string }>(
          'SELECT id, email FROM users WHERE id IN (SELECT value FROM json_each(?))',
          JSON.stringify(connectedIds),
        ).map((row) => [row.id, row.email]),
  );

  return profiles.map((profile) => {
    if (profile.userId === viewerId) {
      return { profile, relevance: NO_RELEVANCE, connection: { id: null, status: 'self', since: null } };
    }
    const connection = connectionRef(connections.get(profile.userId), viewerId);
    const relevance = scoreRelevance(viewer, extractFeatures(profile), {
      incomingRequest: connection.status === 'pending_received',
    });
    const person: Person = { profile, relevance, connection };
    const email = emails.get(profile.userId);
    if (email) person.contactEmail = email;
    return person;
  });
}

export function buildPerson(viewerId: number, profile: Profile): Person {
  return buildPeople(viewerId, [profile])[0];
}
