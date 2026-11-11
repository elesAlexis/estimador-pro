/** Solo publica sobre tags existentes: nunca pide a GitLab crear un tag. */
export async function saveGitlabRelease({ api, projectId, draft, original, signal }) {
  const [tags, releases] = await Promise.all([api.tags(projectId, { signal }), api.releases(projectId, { signal })]);
  if (!tags.some(tag => tag.name === draft.tag_name)) throw new Error('El tag ya no existe. Actualiza las versiones.');
  const current = releases.find(release => release.tag_name === draft.tag_name);
  const comparable = release => release && JSON.stringify({ name: release.name, description: release.description,
    milestones: (release.milestones || []).map(m => m.title).sort() });
  if (comparable(current) !== comparable(original)) throw new Error('La versión cambió en GitLab. Actualiza antes de guardar.');
  const body = { name: draft.name.trim(), description: draft.description, milestones: draft.milestones };
  if (!body.name) throw new Error('Escribe el nombre de la versión.');
  return original ? api.updateRelease(projectId, draft.tag_name, body, { signal })
    : api.createRelease(projectId, { ...body, tag_name: draft.tag_name }, { signal });
}
