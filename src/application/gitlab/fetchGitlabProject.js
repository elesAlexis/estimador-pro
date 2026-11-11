/**
 * Consulta todo lo que la pantalla necesita de un proyecto de GitLab.
 *
 * Estaba escrito dentro del componente, que por eso conocía nombres de campo de
 * la API (`path_with_namespace`). Las dos tandas son deliberadas: los issues,
 * milestones y miembros se piden por el `id` numérico, que solo se conoce
 * después de resolver el proyecto.
 */
export async function fetchGitlabProject({ api, repo, signal }) {
  const [project, user] = await Promise.all([
    api.project(repo, { signal }),
    api.user({ signal }),
  ]);
  const [issues, milestones, members] = await Promise.all([
    api.issuesWithDates(project.id, project.path_with_namespace, { signal }),
    api.milestones(project.id, { signal }),
    api.members(project.id, { signal }),
  ]);
  return { project, user, issues, milestones, members };
}
