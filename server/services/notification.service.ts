import type { NotificationItem, NotificationType, NotificationsResponse } from '../../shared/types';
import { all, get, nowIso, run } from '../db/connection';
import { notFound } from '../lib/errors';
import { type ConnectionRow, connectionRef } from './people.service';

interface NotificationRow {
  id: number;
  type: NotificationType;
  read_at: string | null;
  created_at: string;
  connection_id: number | null;
  actor_id: number | null;
  actor_name: string | null;
  actor_profession: string | null;
  actor_photo: string | null;
  c_id: number | null;
  c_requester_id: number | null;
  c_addressee_id: number | null;
  c_status: ConnectionRow['status'] | null;
  c_created_at: string | null;
  c_responded_at: string | null;
}

export function createNotification(input: {
  userId: number;
  actorId: number | null;
  type: NotificationType;
  connectionId?: number | null;
  createdAt?: string;
  read?: boolean;
}): void {
  const createdAt = input.createdAt ?? nowIso();
  run(
    'INSERT INTO notifications (user_id, actor_id, type, connection_id, read_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    input.userId,
    input.actorId,
    input.type,
    input.connectionId ?? null,
    input.read ? createdAt : null,
    createdAt,
  );
}

export function unreadCount(userId: number): number {
  return get<{ count: number }>(
    'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND read_at IS NULL',
    userId,
  )!.count;
}

export function pendingRequestCount(userId: number): number {
  return get<{ count: number }>(
    "SELECT COUNT(*) AS count FROM connections WHERE addressee_id = ? AND status = 'pending'",
    userId,
  )!.count;
}

export function listNotifications(userId: number, limit = 50): NotificationsResponse {
  const rows = all<NotificationRow>(
    `SELECT n.id, n.type, n.read_at, n.created_at, n.connection_id, n.actor_id,
            p.full_name AS actor_name, p.profession AS actor_profession, p.photo_url AS actor_photo,
            c.id AS c_id, c.requester_id AS c_requester_id, c.addressee_id AS c_addressee_id,
            c.status AS c_status, c.created_at AS c_created_at, c.responded_at AS c_responded_at
     FROM notifications n
     LEFT JOIN profiles p ON p.user_id = n.actor_id
     LEFT JOIN connections c ON c.id = n.connection_id
     WHERE n.user_id = ?
     ORDER BY n.created_at DESC, n.id DESC
     LIMIT ?`,
    userId,
    limit,
  );

  const items: NotificationItem[] = rows.map((row) => ({
    id: row.id,
    type: row.type,
    read: row.read_at !== null,
    createdAt: row.created_at,
    connectionId: row.connection_id,
    actor:
      row.actor_id === null
        ? null
        : {
            userId: row.actor_id,
            fullName: row.actor_name ?? 'A Nexly member',
            profession: row.actor_profession ?? '',
            photoUrl: row.actor_photo,
          },
    connectionStatus:
      row.c_id === null
        ? null
        : connectionRef(
            {
              id: row.c_id,
              requester_id: row.c_requester_id!,
              addressee_id: row.c_addressee_id!,
              status: row.c_status!,
              created_at: row.c_created_at!,
              responded_at: row.c_responded_at,
            },
            userId,
          ).status,
  }));

  return { items, unread: unreadCount(userId) };
}

export function markRead(userId: number, notificationId: number): void {
  const { changes } = run(
    'UPDATE notifications SET read_at = COALESCE(read_at, ?) WHERE id = ? AND user_id = ?',
    nowIso(),
    notificationId,
    userId,
  );
  if (changes === 0) throw notFound('That notification does not exist.');
}

export function markAllRead(userId: number): void {
  run('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL', nowIso(), userId);
}

/** Marks the request notification as read once its recipient has acted on the request. */
export function markRequestHandled(userId: number, connectionId: number): void {
  run(
    `UPDATE notifications SET read_at = COALESCE(read_at, ?)
     WHERE user_id = ? AND connection_id = ? AND type = 'connection_request'`,
    nowIso(),
    userId,
    connectionId,
  );
}
