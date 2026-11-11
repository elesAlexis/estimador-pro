/**
 * Reglas de los sprints.
 */

const SPRINT_NUMBER_PATTERN = /^Sprint (\d+)\b/i;

/**
 * Nombre para un sprint nuevo: "Sprint N", con N uno más que el mayor número
 * usado en los nombres existentes ("Sprint 1 - Base Core" cuenta como 1).
 * Así no se repiten nombres al agregar varios sprints seguidos.
 */
export function getNextSprintName(sprints) {
  const highest = sprints.reduce((max, sprint) => {
    const match = SPRINT_NUMBER_PATTERN.exec(sprint.name ?? '');
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `Sprint ${highest + 1}`;
}
