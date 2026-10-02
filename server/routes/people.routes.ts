import { Router } from 'express';
import { conflict, notFound } from '../lib/errors';
import { currentUserId, requireOnboarded } from '../middleware/auth';
import { connect, getConnectionsOverview, removeConnection, respondToRequest } from '../services/connection.service';
import { getDashboard } from '../services/dashboard.service';
import { decide, getDiscovery, resetSkipped, undoLastDecision } from '../services/discovery.service';
import { getSettings } from '../services/auth.service';
import { buildPerson, connectionsOf } from '../services/people.service';
import { getProfile } from '../services/profile.service';
import { searchPeople } from '../services/search.service';
import { connectSchema, decisionSchema, idParam, parse, parseDiscoveryFilters, parseSearchQuery } from '../validation/schemas';

// Everything that involves other members requires a completed profile.
export const peopleRouter = Router();
peopleRouter.use(requireOnboarded);

peopleRouter.get('/dashboard', (req, res) => {
  res.json(getDashboard(currentUserId(req)));
});

// ---------- Discovery & decisions ----------

peopleRouter.get('/discovery', (req, res) => {
  res.json(getDiscovery(currentUserId(req), parseDiscoveryFilters(req.query)));
});

peopleRouter.post('/decisions', (req, res) => {
  const { targetId, action } = parse(decisionSchema, req.body);
  res.status(201).json(decide(currentUserId(req), targetId, action));
});

peopleRouter.post('/decisions/undo', (req, res) => {
  res.json(undoLastDecision(currentUserId(req)));
});

peopleRouter.delete('/decisions/skipped', (req, res) => {
  res.json({ restored: resetSkipped(currentUserId(req)) });
});

// ---------- People ----------

peopleRouter.get('/search', (req, res) => {
  const { q, scope } = parseSearchQuery(req.query);
  res.json(searchPeople(currentUserId(req), q, scope));
});

peopleRouter.get('/users/:id', (req, res) => {
  const profile = getProfile(parse(idParam, req.params.id));
  const viewerId = currentUserId(req);
  if (profile.userId !== viewerId) {
    // An unfinished profile is never shown. A hidden one is shown only to people it has a request or connection with.
    const hidden = !getSettings(profile.userId).discoverable && !connectionsOf(viewerId).has(profile.userId);
    if (!profile.onboarded || hidden) throw notFound('That profile does not exist.');
  }
  res.json({ person: buildPerson(viewerId, profile) });
});

// ---------- Connections ----------

peopleRouter.get('/connections', (req, res) => {
  res.json(getConnectionsOverview(currentUserId(req)));
});

peopleRouter.post('/connections', (req, res) => {
  const { targetId } = parse(connectSchema, req.body);
  const result = connect(currentUserId(req), targetId);
  if (result.outcome === 'already_pending') {
    throw conflict('ALREADY_PENDING', `You have already sent ${result.person.profile.fullName} a request.`);
  }
  if (result.outcome === 'already_connected') {
    throw conflict('ALREADY_CONNECTED', `You are already connected with ${result.person.profile.fullName}.`);
  }
  res.status(201).json(result);
});

peopleRouter.post('/connections/:id/accept', (req, res) => {
  res.json({ person: respondToRequest(currentUserId(req), parse(idParam, req.params.id), 'accept') });
});

peopleRouter.post('/connections/:id/decline', (req, res) => {
  res.json({ person: respondToRequest(currentUserId(req), parse(idParam, req.params.id), 'decline') });
});

peopleRouter.delete('/connections/:id', (req, res) => {
  res.json({ person: removeConnection(currentUserId(req), parse(idParam, req.params.id)) });
});
