import type { ConnectOutcome, ConnectionsOverview, Person } from '../../shared/types';
import { get, nowIso, run, transaction } from '../db/connection';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors';
import { getSettings } from './auth.service';
import { emailAccepted, emailRequest, notifyAcceptedInApp, notifyRequestInApp } from './connection-events';
import { markRequestHandled } from './notification.service';
import { type ConnectionRow, buildPeople, buildPerson, connectionsOf } from './people.service';
import { getProfile, loadProfiles } from './profile.service';

function findPair(a: number, b: number): ConnectionRow | undefined {
  return get<ConnectionRow>(
    `SELECT * FROM connections
     WHERE min(requester_id, addressee_id) = min(?1, ?2) AND max(requester_id, addressee_id) = max(?1, ?2)`,
    a,
    b,
  );
}

function recordConnectDecision(viewerId: number, targetId: number): void {
  run(
    `INSERT INTO decisions (viewer_id, target_id, action, created_at) VALUES (?, ?, 'connect', ?)
     ON CONFLICT(viewer_id, target_id) DO UPDATE SET action = 'connect', created_at = excluded.created_at`,
    viewerId,
    targetId,
    nowIso(),
  );
}

function accept(row: ConnectionRow, accepterId: number): void {
  run("UPDATE connections SET status = 'accepted', responded_at = ? WHERE id = ?", nowIso(), row.id);
  markRequestHandled(accepterId, row.id);
  notifyAcceptedInApp(accepterId, row.requester_id, row.id);
}

/**
 * The single entry point for "I want to connect with this person", used by every Connect button
 * in the app. It is idempotent: the unique pair index plus these checks mean a request can never
 * be duplicated.
 */
export function connect(viewerId: number, targetId: number): { outcome: ConnectOutcome; person: Person } {
  if (viewerId === targetId) throw badRequest('You cannot connect with yourself.');
  const target = getProfile(targetId);
  if (!target.onboarded) throw notFound('That profile does not exist.');
  // A member who has hidden their profile can only be reached by someone they already have a request with.
  if (!getSettings(targetId).discoverable && !findPair(viewerId, targetId)) throw notFound('That profile does not exist.');

  const outcome = transaction<ConnectOutcome>(() => {
    recordConnectDecision(viewerId, targetId);
    const existing = findPair(viewerId, targetId);

    if (!existing) {
      const { lastId } = run(
        "INSERT INTO connections (requester_id, addressee_id, status, created_at) VALUES (?, ?, 'pending', ?)",
        viewerId,
        targetId,
        nowIso(),
      );
      notifyRequestInApp(viewerId, targetId, lastId);
      return 'requested';
    }
    if (existing.status === 'accepted') return 'already_connected';

    // They asked first (or the viewer declined earlier and has changed their mind): accept their request.
    if (existing.requester_id === targetId) {
      accept(existing, viewerId);
      return 'connected';
    }
    return 'already_pending';
  });

  // Emails go out only once the change is committed.
  if (outcome === 'requested') emailRequest(viewerId, targetId);
  if (outcome === 'connected') emailAccepted(viewerId, targetId);
  return { outcome, person: buildPerson(viewerId, target) };
}

function ownedConnection(viewerId: number, connectionId: number): ConnectionRow {
  const row = get<ConnectionRow>('SELECT * FROM connections WHERE id = ?', connectionId);
  if (!row) throw notFound('That connection no longer exists.');
  if (row.requester_id !== viewerId && row.addressee_id !== viewerId) throw forbidden();
  return row;
}

export function respondToRequest(viewerId: number, connectionId: number, action: 'accept' | 'decline'): Person {
  const row = ownedConnection(viewerId, connectionId);
  if (row.addressee_id !== viewerId) throw forbidden('Only the person who received a request can respond to it.');
  if (row.status === 'accepted') throw conflict('ALREADY_CONNECTED', 'You are already connected.');
  if (action === 'decline' && row.status === 'declined') throw conflict('ALREADY_DECLINED', 'You already declined this request.');

  transaction(() => {
    if (action === 'accept') {
      accept(row, viewerId);
    } else {
      run("UPDATE connections SET status = 'declined', responded_at = ? WHERE id = ?", nowIso(), row.id);
      markRequestHandled(viewerId, row.id);
    }
  });
  if (action === 'accept') emailAccepted(viewerId, row.requester_id);
  return buildPerson(viewerId, getProfile(row.requester_id));
}

/** Removes an accepted connection, or withdraws a request the viewer sent. */
export function removeConnection(viewerId: number, connectionId: number): Person {
  const row = ownedConnection(viewerId, connectionId);
  if (row.status !== 'accepted' && row.requester_id !== viewerId) {
    throw badRequest('Decline this request instead of removing it.');
  }
  // Notifications that reference the connection are removed by ON DELETE CASCADE.
  run('DELETE FROM connections WHERE id = ?', row.id);
  const otherId = row.requester_id === viewerId ? row.addressee_id : row.requester_id;
  return buildPerson(viewerId, getProfile(otherId));
}

export function getConnectionsOverview(viewerId: number): ConnectionsOverview {
  const connections = connectionsOf(viewerId);
  const profiles = loadProfiles({ ids: [...connections.keys()] });
  const people = buildPeople(viewerId, [...profiles.values()], { connections });

  const newestFirst = (a: Person, b: Person) => (b.connection.since ?? '').localeCompare(a.connection.since ?? '');
  const byStatus = (status: Person['connection']['status']) =>
    people.filter((person) => person.connection.status === status).sort(newestFirst);

  return {
    incoming: byStatus('pending_received'),
    sent: byStatus('pending_sent'),
    accepted: byStatus('connected'),
  };
}
