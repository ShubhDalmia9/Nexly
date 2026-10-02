import { config } from '../config';
import { get } from '../db/connection';
import { sendEmailInBackground } from '../email/mailer';
import * as templates from '../email/templates';
import { getSettings } from './auth.service';
import { createNotification } from './notification.service';
import { buildPerson } from './people.service';
import { getProfile } from './profile.service';

/**
 * Telling people about connection activity, in the app and by email, according to each
 * recipient's own notification settings.
 *
 * The in-app functions write to the database and are called inside the connection's transaction.
 * The email functions are called after it commits, so an email is never sent for a change that
 * was rolled back.
 */

export function notifyRequestInApp(fromId: number, toId: number, connectionId: number): void {
  if (!getSettings(toId).notifyRequests) return;
  createNotification({ userId: toId, actorId: fromId, type: 'connection_request', connectionId });
}

export function notifyAcceptedInApp(accepterId: number, requesterId: number, connectionId: number): void {
  if (!getSettings(requesterId).notifyAccepted) return;
  createNotification({ userId: requesterId, actorId: accepterId, type: 'connection_accepted', connectionId });
}

/** The address to write to, or null for accounts that should never be emailed. */
function emailAddress(userId: number): string | null {
  const row = get<{ email: string; is_demo: number }>('SELECT email, is_demo FROM users WHERE id = ?', userId);
  // The members that come with the app have addresses that cannot receive email.
  if (!row || row.is_demo === 1) return null;
  return row.email;
}

const roleOf = (profession: string, workplace: string) => [profession, workplace].filter(Boolean).join(' at ');

export function emailRequest(fromId: number, toId: number): void {
  const to = emailAddress(toId);
  if (!to || !getSettings(toId).emailRequests) return;
  const recipient = getProfile(toId);
  // The sender as the recipient sees them, so the email can say why they are relevant.
  const sender = buildPerson(toId, getProfile(fromId));
  sendEmailInBackground({
    to,
    template: 'connection-request',
    ...templates.connectionRequest({
      recipientName: recipient.fullName,
      senderName: sender.profile.fullName,
      senderRole: roleOf(sender.profile.profession, sender.profile.workplace),
      reasons: sender.relevance.reasons
        .filter((reason) => reason.kind !== 'incoming')
        .slice(0, 3)
        .map((reason) => reason.label.toLowerCase()),
      url: `${config.appUrl}/connections?tab=requests`,
      settingsUrl: `${config.appUrl}/settings`,
    }),
  });
}

export function emailAccepted(accepterId: number, requesterId: number): void {
  const to = emailAddress(requesterId);
  if (!to || !getSettings(requesterId).emailAccepted) return;
  const accepter = getProfile(accepterId);
  sendEmailInBackground({
    to,
    template: 'connection-accepted',
    ...templates.connectionAccepted({
      recipientName: getProfile(requesterId).fullName,
      accepterName: accepter.fullName,
      accepterRole: roleOf(accepter.profession, accepter.workplace),
      url: `${config.appUrl}/people/${accepterId}`,
      settingsUrl: `${config.appUrl}/settings`,
    }),
  });
}
