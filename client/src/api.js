async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'Die Anfrage konnte nicht verarbeitet werden.');
  }

  if (response.status === 204) return null;
  return response.json();
}

const json = (method, body) => ({ method, body: JSON.stringify(body) });

export const api = {
  getProjects: () => request('/api/projects'),
  createProject: (values) => request('/api/projects', json('POST', values)),
  updateProject: (id, values) => request(`/api/projects/${id}`, json('PUT', values)),
  deleteProject: (id) => request(`/api/projects/${id}`, { method: 'DELETE' }),
  createSubbudget: (projectId, values) => request(`/api/projects/${projectId}/subbudgets`, json('POST', values)),
  updateSubbudget: (id, values) => request(`/api/subbudgets/${id}`, json('PUT', values)),
  deleteSubbudget: (id) => request(`/api/subbudgets/${id}`, { method: 'DELETE' }),
  createPosition: (subbudgetId, values) => request(`/api/subbudgets/${subbudgetId}/positions`, json('POST', values)),
  updatePosition: (id, values) => request(`/api/positions/${id}`, json('PUT', values)),
  updatePositionStatus: (id, values) => request(`/api/positions/${id}/status`, json('PATCH', values)),
  deletePosition: (id) => request(`/api/positions/${id}`, { method: 'DELETE' }),
};
