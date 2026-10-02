import { Router } from 'express';
import { currentUserId, requireAuth } from '../middleware/auth';
import { listNotifications, markAllRead, markRead, pendingRequestCount, unreadCount } from '../services/notification.service';
import { idParam, parse } from '../validation/schemas';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get('/', (req, res) => {
  res.json(listNotifications(currentUserId(req)));
});

// Polled by the UI to keep the bell and the Connections badge current.
notificationsRouter.get('/summary', (req, res) => {
  const userId = currentUserId(req);
  res.json({ unread: unreadCount(userId), pendingRequests: pendingRequestCount(userId) });
});

notificationsRouter.post('/read-all', (req, res) => {
  markAllRead(currentUserId(req));
  res.json(listNotifications(currentUserId(req)));
});

notificationsRouter.post('/:id/read', (req, res) => {
  markRead(currentUserId(req), parse(idParam, req.params.id));
  res.json({ unread: unreadCount(currentUserId(req)) });
});
