async function request(method: string, path: string, body?: unknown) {
  const apiKey = localStorage.getItem('pith_api_key') || '';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const res = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.errors?.message || `HTTP ${res.status}`);
  return json;
}

export const api = {
  health: () => request('GET', '/health'),
  listProjects: () => request('GET', '/api/v1/projects'),
  getProject: (slug: string) => request('GET', `/api/v1/projects/${slug}`),
  listTasks: (slug: string, params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/api/v1/projects/${slug}/tasks${qs ? `?${qs}` : ''}`);
  },
  getTask: (id: string) => request('GET', `/api/v1/tasks/${id}`),
  updateTask: (id: string, body: Record<string, unknown>) => request('PATCH', `/api/v1/tasks/${id}`, body),
  createTask: (slug: string, body: Record<string, unknown>) => request('POST', `/api/v1/projects/${slug}/tasks`, body),
  addComment: (taskId: string, body: string) => request('POST', `/api/v1/tasks/${taskId}/comments`, { body }),
  getAnalytics: (slug: string) => request('GET', `/api/v1/projects/${slug}/analytics`),
  listSessions: (limit = 50) => request('GET', `/api/v1/sessions?limit=${limit}`),
  getSession: (id: string) => request('GET', `/api/v1/sessions/${id}`),
};

export function setApiKey(key: string) {
  localStorage.setItem('pith_api_key', key);
  window.location.reload();
}
