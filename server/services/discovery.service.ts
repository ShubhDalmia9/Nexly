import { connectionType } from '../../shared/constants';
import type { DiscoveryFilters, DiscoveryResponse, DiscoveryStats, Person, Profile, DecisionResult, UndoResult } from '../../shared/types';
import { all, get, nowIso, run, transaction } from '../db/connection';
import { badRequest, conflict, notFound } from '../lib/errors';
import { normalise } from '../lib/taxonomy';
import { connect } from './connection.service';
import { type ConnectionRow, buildPeople, buildPerson, connectionsOf } from './people.service';
import { getProfile, loadProfiles } from './profile.service';

const MAX_DECK = 60;

interface DecisionRow {
  id: number;
  viewer_id: number;
  target_id: number;
  action: 'connect' | 'skip';
  created_at: string;
}

/**
 * Who can still appear in the viewer's list: discoverable members they have not yet decided on
 * and have no connection with. People who have asked to connect with the viewer stay eligible,
 * so the viewer can answer with Connect or Skip.
 */
function eligibleProfiles(viewerId: number, connections: Map<number, ConnectionRow>): Profile[] {
  const decided = new Set(
    all<{ target_id: number }>('SELECT target_id FROM decisions WHERE viewer_id = ?', viewerId).map((row) => row.target_id),
  );
  const result: Profile[] = [];
  for (const profile of loadProfiles({ onlyDiscoverable: true }).values()) {
    if (profile.userId === viewerId || decided.has(profile.userId)) continue;
    const connection = connections.get(profile.userId);
    const awaitingViewer = connection?.status === 'pending' && connection.requester_id === profile.userId;
    if (connection && !awaitingViewer) continue;
    result.push(profile);
  }
  return result;
}

const includesText = (value: string, query: string) => normalise(value).includes(normalise(query));

function hasAll(values: string[], required: string[]): boolean {
  if (required.length === 0) return true;
  const present = new Set(values.map(normalise));
  return required.every((item) => present.has(normalise(item)));
}

function matchesFilters(profile: Profile, filters: DiscoveryFilters): boolean {
  if (filters.profession && !includesText(profile.profession, filters.profession)) return false;
  if (filters.workplace && !includesText(profile.workplace, filters.workplace)) return false;
  if (filters.specialisation && !includesText(profile.specialisation, filters.specialisation)) return false;
  if (!hasAll(profile.skills, filters.skills)) return false;
  if (!hasAll(profile.interests, filters.interests)) return false;
  if (!hasAll(profile.goals, filters.goals)) return false;
  if (filters.projectType && !profile.projects.some((project) => project.type === filters.projectType)) return false;
  // "I'm looking for mentors" means: show people who are looking for mentees.
  if (filters.lookingFor && !profile.lookingFor.includes(connectionType(filters.lookingFor).complement)) return false;
  return true;
}

function sortPeople(people: Person[], sort: DiscoveryFilters['sort']): Person[] {
  const byScore = (a: Person, b: Person) =>
    b.relevance.score - a.relevance.score || a.profile.fullName.localeCompare(b.profile.fullName);
  const sorted = [...people];
  switch (sort) {
    case 'shared_skills':
      return sorted.sort((a, b) => b.relevance.sharedSkills.length - a.relevance.sharedSkills.length || byScore(a, b));
    case 'shared_interests':
      return sorted.sort((a, b) => b.relevance.sharedInterests.length - a.relevance.sharedInterests.length || byScore(a, b));
    case 'newest':
      return sorted.sort((a, b) => b.profile.joinedAt.localeCompare(a.profile.joinedAt) || byScore(a, b));
    default:
      return sorted.sort(byScore);
  }
}

export function getStats(viewerId: number, remaining?: number): DiscoveryStats {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const counts = get<{ today: number; skipped: number; sent: number; connected: number }>(
    `SELECT
       (SELECT COUNT(*) FROM decisions WHERE viewer_id = ?1 AND created_at >= ?2) AS today,
       (SELECT COUNT(*) FROM decisions WHERE viewer_id = ?1 AND action = 'skip') AS skipped,
       (SELECT COUNT(*) FROM connections WHERE requester_id = ?1 AND status <> 'accepted') AS sent,
       (SELECT COUNT(*) FROM connections WHERE (requester_id = ?1 OR addressee_id = ?1) AND status = 'accepted') AS connected`,
    viewerId,
    dayAgo,
  )!;
  return {
    remaining: remaining ?? eligibleProfiles(viewerId, connectionsOf(viewerId)).length,
    reviewedToday: counts.today,
    skipped: counts.skipped,
    requestsSent: counts.sent,
    connections: counts.connected,
  };
}

export function getDiscovery(viewerId: number, filters: DiscoveryFilters, limit = MAX_DECK): DiscoveryResponse {
  const viewer = getProfile(viewerId);
  const connections = connectionsOf(viewerId);
  const eligible = eligibleProfiles(viewerId, connections);
  const filtered = eligible.filter((profile) => matchesFilters(profile, filters));
  const people = sortPeople(buildPeople(viewerId, filtered, { viewer, connections }), filters.sort);

  return {
    people: people.slice(0, Math.min(limit, MAX_DECK)),
    total: people.length,
    stats: getStats(viewerId, eligible.length),
  };
}

/** Records the viewer's decision on a profile: Connect sends a request, Skip sets the profile aside. */
export function decide(viewerId: number, targetId: number, action: 'connect' | 'skip'): DecisionResult {
  if (viewerId === targetId) throw badRequest('You cannot connect with or skip your own profile.');
  const target = getProfile(targetId);
  if (!target.onboarded) throw notFound('That profile does not exist.');

  if (action === 'connect') {
    const result = connect(viewerId, targetId);
    return { action, outcome: result.outcome, person: result.person, stats: getStats(viewerId) };
  }

  run(
    `INSERT INTO decisions (viewer_id, target_id, action, created_at) VALUES (?, ?, 'skip', ?)
     ON CONFLICT(viewer_id, target_id) DO UPDATE SET action = 'skip', created_at = excluded.created_at`,
    viewerId,
    targetId,
    nowIso(),
  );
  return { action, outcome: 'skipped', person: buildPerson(viewerId, target), stats: getStats(viewerId) };
}

/** Reverses the viewer's most recent decision and puts that profile back in their list. */
export function undoLastDecision(viewerId: number): UndoResult {
  const last = get<DecisionRow>('SELECT * FROM decisions WHERE viewer_id = ? ORDER BY created_at DESC, id DESC LIMIT 1', viewerId);
  if (!last) throw notFound('There is nothing to undo.');

  transaction(() => {
    if (last.action === 'connect') {
      const connection = connectionsOf(viewerId).get(last.target_id);
      if (connection?.status === 'accepted') {
        throw conflict(
          'ALREADY_CONNECTED',
          'You are already connected with this person. Remove the connection from your Connections page instead.',
        );
      }
      // Withdraw the request this decision created; its notification goes with it.
      if (connection && connection.requester_id === viewerId) {
        run('DELETE FROM connections WHERE id = ?', connection.id);
      }
    }
    run('DELETE FROM decisions WHERE id = ?', last.id);
  });

  return {
    action: last.action,
    person: buildPerson(viewerId, getProfile(last.target_id)),
    stats: getStats(viewerId),
  };
}

/** Lets the viewer take a second look at everyone they skipped. */
export function resetSkipped(viewerId: number): number {
  return run("DELETE FROM decisions WHERE viewer_id = ? AND action = 'skip'", viewerId).changes;
}
