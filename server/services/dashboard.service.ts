import { computeCompletion } from '../../shared/completion';
import type { DashboardResponse, DiscoveryFilters, SuggestedAction } from '../../shared/types';
import { getConnectionsOverview } from './connection.service';
import { getDiscovery } from './discovery.service';
import { listNotifications } from './notification.service';
import { getProfile } from './profile.service';

const NO_FILTERS: DiscoveryFilters = {
  profession: '',
  workplace: '',
  specialisation: '',
  skills: [],
  interests: [],
  goals: [],
  projectType: '',
  lookingFor: '',
  sort: 'relevance',
};

export function getDashboard(viewerId: number): DashboardResponse {
  const profile = getProfile(viewerId);
  const completion = computeCompletion(profile);
  const discovery = getDiscovery(viewerId, NO_FILTERS);
  const connections = getConnectionsOverview(viewerId);
  const notifications = listNotifications(viewerId, 5);

  const actions: SuggestedAction[] = [];
  if (connections.incoming.length > 0) {
    const count = connections.incoming.length;
    actions.push({
      id: 'requests',
      title: count === 1 ? 'Respond to 1 request' : `Respond to ${count} requests`,
      description: `${connections.incoming[0].profile.fullName}${count > 1 ? ' and others are' : ' is'} waiting to hear from you.`,
      href: '/connections',
      cta: 'Review requests',
    });
  }
  const highlyRelevant = discovery.people.filter((person) => person.relevance.tier === 'high').length;
  if (discovery.stats.remaining > 0) {
    actions.push({
      id: 'discover',
      title:
        highlyRelevant > 0
          ? `${highlyRelevant} highly relevant ${highlyRelevant === 1 ? 'person' : 'people'} to review`
          : 'New people to meet',
      description: `${discovery.stats.remaining} profiles are ranked for you in Discover.`,
      href: '/discover',
      cta: 'Start discovering',
    });
  }
  for (const item of completion.items.filter((entry) => !entry.done).slice(0, 2)) {
    actions.push({
      id: `profile-${item.key}`,
      title: `Add ${item.label.toLowerCase()}`,
      description: `${item.hint}. Worth ${item.weight}% of your profile strength.`,
      href: '/profile/edit',
      cta: 'Edit profile',
    });
  }

  return {
    recommended: discovery.people.slice(0, 4),
    incoming: connections.incoming.slice(0, 3),
    incomingCount: connections.incoming.length,
    recentConnections: connections.accepted.slice(0, 4),
    notifications: notifications.items,
    unreadNotifications: notifications.unread,
    completion,
    stats: discovery.stats,
    actions: actions.slice(0, 4),
  };
}
