export function createHttpBackupRepository() {
  async function request(path, options) {
    const response = await fetch(path, { ...options, signal: AbortSignal.timeout(10000) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'El servicio de respaldos no está disponible.');
    return result;
  }

  return {
    save: (projectInfo, sprints) => request('/api/backups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectInfo, sprints }),
    }),
    read: id => request(`/api/backups/${encodeURIComponent(id)}`),
  };
}
