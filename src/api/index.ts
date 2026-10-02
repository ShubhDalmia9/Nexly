import type { SearchScope } from '../../shared/constants';
import type {
  AuthOptions,
  ConnectResult,
  ConnectionsOverview,
  DashboardResponse,
  DecisionResult,
  DiscoveryFilters,
  DiscoveryResponse,
  InboxEmail,
  LinkedInImportResult,
  Meta,
  NotificationsResponse,
  Person,
  ProfileInput,
  SearchResponse,
  SecurityOverview,
  SessionResponse,
  SessionUser,
  UndoResult,
  UserSettings,
} from '../../shared/types';
import { http, upload } from './client';

type UserResponse = { user: SessionUser };
type Progress = (fraction: number) => void;

function discoveryQuery(filters: DiscoveryFilters): string {
  const params = new URLSearchParams();
  if (filters.profession) params.set('profession', filters.profession);
  if (filters.workplace) params.set('workplace', filters.workplace);
  if (filters.specialisation) params.set('specialisation', filters.specialisation);
  if (filters.skills.length) params.set('skills', filters.skills.join(','));
  if (filters.interests.length) params.set('interests', filters.interests.join(','));
  if (filters.goals.length) params.set('goals', filters.goals.join(','));
  if (filters.projectType) params.set('projectType', filters.projectType);
  if (filters.lookingFor) params.set('lookingFor', filters.lookingFor);
  if (filters.sort !== 'relevance') params.set('sort', filters.sort);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const api = {
  auth: {
    me: () => http.get<SessionResponse>('/auth/me'),
    options: () => http.get<AuthOptions>('/auth/options'),
    /** Creates the account and signs in. */
    signUp: (input: { fullName: string; email: string; password: string }) => http.post<UserResponse>('/auth/signup', input),
    logIn: (input: { email: string; password: string }) => http.post<UserResponse>('/auth/login', input),
    logOut: () => http.post<{ ok: true }>('/auth/logout'),
    forgotPassword: (email: string) => http.post<{ ok: true }>('/auth/forgot-password', { email }),
    checkResetToken: (token: string) => http.post<{ email: string }>('/auth/reset-password/check', { token }),
    resetPassword: (token: string, password: string) => http.post<{ ok: true }>('/auth/reset-password', { token, password }),
  },
  account: {
    security: () => http.get<SecurityOverview>('/account/security'),
    saveSettings: (settings: UserSettings) => http.put<UserResponse>('/account/settings', settings),
    saveName: (fullName: string) => http.put<UserResponse>('/account/name', { fullName }),
    changePassword: (input: { currentPassword: string; newPassword: string }) => http.post<UserResponse>('/account/password', input),
    signOutOtherSessions: () => http.post<{ revoked: number; security: SecurityOverview }>('/account/sessions/revoke-others'),
    deleteAccount: (input: { password: string }) => http.post<{ ok: true }>('/account/delete', input),
  },
  profile: {
    meta: () => http.get<Meta>('/profile/meta'),
    save: (input: ProfileInput, completeOnboarding = false) => http.put<UserResponse>('/profile', { ...input, completeOnboarding }),
    uploadPhoto: (image: Blob, onProgress?: Progress) => upload<UserResponse>('PUT', '/profile/photo', image, onProgress),
    removePhoto: () => http.delete<UserResponse>('/profile/photo'),
    uploadProjectImage: (image: Blob, onProgress?: Progress) => upload<{ url: string }>('POST', '/profile/project-image', image, onProgress),
  },
  linkedin: {
    /** Uploads the member's LinkedIn profile PDF or data-export ZIP and returns the details read from it. */
    importFile: (file: File, onProgress?: Progress) =>
      upload<LinkedInImportResult>(
        'POST',
        `/import/linkedin/file?${new URLSearchParams({ name: file.name }).toString()}`,
        // The server identifies the file from its contents; the type here only selects the body parser.
        new Blob([file], { type: /\.zip$/i.test(file.name) ? 'application/zip' : 'application/pdf' }),
        onProgress,
      ),
  },
  inbox: {
    list: () => http.get<{ emails: InboxEmail[] }>('/inbox'),
    clear: () => http.delete<{ ok: true }>('/inbox'),
  },
  dashboard: () => http.get<DashboardResponse>('/dashboard'),
  discovery: {
    list: (filters: DiscoveryFilters) => http.get<DiscoveryResponse>(`/discovery${discoveryQuery(filters)}`),
    /** Records Connect or Skip for a profile. */
    decide: (targetId: number, action: 'connect' | 'skip') => http.post<DecisionResult>('/decisions', { targetId, action }),
    undo: () => http.post<UndoResult>('/decisions/undo'),
    restoreSkipped: () => http.delete<{ restored: number }>('/decisions/skipped'),
  },
  people: {
    get: (userId: number) => http.get<{ person: Person }>(`/users/${userId}`),
    search: (query: string, scope: SearchScope) =>
      http.get<SearchResponse>(`/search?${new URLSearchParams({ q: query, scope }).toString()}`),
  },
  connections: {
    list: () => http.get<ConnectionsOverview>('/connections'),
    connect: (targetId: number) => http.post<ConnectResult>('/connections', { targetId }),
    accept: (connectionId: number) => http.post<{ person: Person }>(`/connections/${connectionId}/accept`),
    decline: (connectionId: number) => http.post<{ person: Person }>(`/connections/${connectionId}/decline`),
    remove: (connectionId: number) => http.delete<{ person: Person }>(`/connections/${connectionId}`),
  },
  notifications: {
    list: () => http.get<NotificationsResponse>('/notifications'),
    summary: () => http.get<{ unread: number; pendingRequests: number }>('/notifications/summary'),
    markRead: (id: number) => http.post<{ unread: number }>(`/notifications/${id}/read`),
    markAllRead: () => http.post<NotificationsResponse>('/notifications/read-all'),
  },
};
