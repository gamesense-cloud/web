/**
 * Thin fetch wrapper. Every call goes through here so the bearer token and the
 * error shape are handled in one place.
 */

const TOKEN_KEY = 'gsc.token';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private windows and blocked storage — the session just does not persist */
  }
}

export class ApiError extends Error {
  constructor(message, status, errors) {
    super(message);
    this.status = status;
    this.errors = errors ?? null;
  }
}

async function request(path, { method = 'GET', body } = {}) {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new ApiError(data.error ?? 'something went wrong', res.status, data.errors);
  return data;
}

const get = (p) => request(p);
const post = (p, body) => request(p, { method: 'POST', body });
const patch = (p, body) => request(p, { method: 'PATCH', body });

const qs = (params = {}) => {
  const search = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== null && v !== undefined && v !== '')
  ).toString();
  return search ? `?${search}` : '';
};

export const api = {
  // auth
  me: () => get('/auth/me'),
  login: (identifier, password) => post('/auth/login', { identifier, password }),
  register: (username, email, password) => post('/auth/register', { username, email, password }),
  logout: () => post('/auth/logout'),
  changePassword: (currentPassword, newPassword) =>
    post('/auth/password', { currentPassword, newPassword }),

  // the signed-in account
  account: () => get('/users/me'),
  updateAccount: (payload) => patch('/users/me', payload),

  // member dashboard
  overview: () => get('/dashboard/overview'),
  activity: (scope) => get(`/dashboard/activity${qs({ scope })}`),
  announcements: () => get('/dashboard/announcements'),

  // builds
  builds: () => get('/builds'),
  build: (id) => get(`/builds/${id}`),
  download: (id) => post(`/builds/${id}/download`),
  myDownloads: () => get('/builds/downloads'),

  // hwid
  hwid: () => get('/hwid'),
  requestReset: (reason) => post('/hwid/reset', { reason }),

  // tickets
  tickets: (status) => get(`/tickets${qs({ status })}`),
  ticket: (id) => get(`/tickets/${id}`),
  createTicket: (payload) => post('/tickets', payload),
  replyToTicket: (id, body) => post(`/tickets/${id}/reply`, { body }),
  setTicketStatus: (id, status) => post(`/tickets/${id}/status`, { status }),

  // admin
  admin: {
    overview: () => get('/admin/overview'),
    members: (params) => get(`/admin/members${qs(params)}`),
    member: (username) => get(`/admin/members/${username}`),
    setRole: (username, role) => post(`/admin/members/${username}/role`, { role }),
    ban: (username, reason) => post(`/admin/members/${username}/ban`, { reason }),
    grant: (username, plan) => post(`/admin/members/${username}/subscription`, { plan }),
    revokeSessions: (username) => post(`/admin/members/${username}/revoke-sessions`),
    publishBuild: (payload) => post('/admin/builds', payload),
    setBuildStatus: (id, status) => post(`/admin/builds/${id}/status`, { status }),
    resets: () => get('/admin/resets'),
    resolveReset: (id, status, note) => post(`/admin/resets/${id}`, { status, note }),
    announce: (payload) => post('/dashboard/announcements', payload),
  },
};

export default api;
