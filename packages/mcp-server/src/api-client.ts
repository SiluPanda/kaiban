const PITH_URL = process.env.PITH_URL || 'http://localhost:3456';
const PITH_API_KEY = process.env.PITH_API_KEY || '';

async function request(method: string, path: string, body?: unknown): Promise<any> {
  const url = `${PITH_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${PITH_API_KEY}`,
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();

  if (!res.ok) {
    const msg = json?.errors?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return json;
}

export const api = {
  // Auth
  login: (email: string, apiKey: string) =>
    request('POST', '/api/v1/auth/login', { email, apiKey }),

  // Projects
  listProjects: (limit = 20, offset = 0) =>
    request('GET', `/api/v1/projects?limit=${limit}&offset=${offset}`),
  getProject: (slug: string) =>
    request('GET', `/api/v1/projects/${encodeURIComponent(slug)}`),

  // Tasks
  listTasks: (slug: string, params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/api/v1/projects/${encodeURIComponent(slug)}/tasks${qs ? `?${qs}` : ''}`);
  },
  getTask: (id: string) =>
    request('GET', `/api/v1/tasks/${id}`),
  createTask: (slug: string, body: Record<string, unknown>) =>
    request('POST', `/api/v1/projects/${encodeURIComponent(slug)}/tasks`, body),
  updateTask: (id: string, body: Record<string, unknown>) =>
    request('PATCH', `/api/v1/tasks/${id}`, body),
  createSubtasks: (parentId: string, subtasks: Array<Record<string, unknown>>) =>
    request('POST', `/api/v1/tasks/${parentId}/subtasks`, { subtasks }),

  // Comments
  addComment: (taskId: string, body: string) =>
    request('POST', `/api/v1/tasks/${taskId}/comments`, { body }),
  listComments: (taskId: string, limit = 20, offset = 0) =>
    request('GET', `/api/v1/tasks/${taskId}/comments?limit=${limit}&offset=${offset}`),

  // Activity
  getActivity: (taskId: string, limit = 50, offset = 0) =>
    request('GET', `/api/v1/tasks/${taskId}/activity?limit=${limit}&offset=${offset}`),

  // Search
  search: (q: string, limit = 20, offset = 0) =>
    request('GET', `/api/v1/search?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`),

  // Users
  getMe: () =>
    request('GET', '/api/v1/users/me'),
  listUsers: (limit = 20, offset = 0) =>
    request('GET', `/api/v1/users?limit=${limit}&offset=${offset}`),
};
