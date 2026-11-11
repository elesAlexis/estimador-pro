/**
 * Acciones del proyecto: la única forma en que la vista modifica sprints y tareas.
 *
 * Los componentes las usan a través de `useProjectActions()` sin conocer los
 * tipos ni la forma de los payloads del reducer. Los IDs se generan aquí, fuera
 * del reducer, para que este sea una función pura.
 */

export const ActionTypes = Object.freeze({
  REPLACE_PROJECT: 'REPLACE_PROJECT',
  SET_PROJECT_INFO: 'SET_PROJECT_INFO',
  RECORD_REMOTE: 'RECORD_REMOTE',
  RECALCULATE_IMPORTED: 'RECALCULATE_IMPORTED',
  LOAD_SPRINTS: 'LOAD_SPRINTS',
  LOAD_TEMPLATE: 'LOAD_TEMPLATE',
  ADD_SPRINT: 'ADD_SPRINT',
  REMOVE_SPRINT: 'REMOVE_SPRINT',
  RENAME_SPRINT: 'RENAME_SPRINT',
  CLONE_SPRINT: 'CLONE_SPRINT',
  MOVE_SPRINT: 'MOVE_SPRINT',
  ADD_TASK: 'ADD_TASK',
  UPDATE_TASK: 'UPDATE_TASK',
  SET_REAL_DATES: 'SET_REAL_DATES',
  REMOVE_TASK: 'REMOVE_TASK',
  MOVE_TASK: 'MOVE_TASK',
  SET_INTEGRATION_CONFIG: 'SET_INTEGRATION_CONFIG',
  UPDATE_EXTERNAL_IDS: 'UPDATE_EXTERNAL_IDS',
  CACHE_ISSUE_COMMENTS: 'CACHE_ISSUE_COMMENTS',
  SET_PRODUCT_DELIVERY_SPRINT: 'SET_PRODUCT_DELIVERY_SPRINT',
});

/** Genera un ID único con prefijo (p. ej. `sprint-…`, `t-…`). */
export const createId = (prefix) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const projectActions = {
  /** Información y sprints cambian juntos: el proyecto llega ya normalizado. */
  replaceProject: (project) => ({ type: ActionTypes.REPLACE_PROJECT, payload: project }),

  setProjectInfo: (info) => ({ type: ActionTypes.SET_PROJECT_INFO, payload: info }),

  recordRemote: (entry, remote) => ({ type: ActionTypes.RECORD_REMOTE, payload: { entry, remote } }),

  recalculateImported: () => ({ type: ActionTypes.RECALCULATE_IMPORTED }),

  loadSprints: (sprints) => ({ type: ActionTypes.LOAD_SPRINTS, payload: sprints }),

  loadTemplate: () => ({ type: ActionTypes.LOAD_TEMPLATE }),

  addSprint: () => ({ type: ActionTypes.ADD_SPRINT, payload: { sprintId: createId('sprint') } }),

  removeSprint: (sprintId) => ({ type: ActionTypes.REMOVE_SPRINT, payload: { sprintId } }),

  renameSprint: (sprintId, name) => ({ type: ActionTypes.RENAME_SPRINT, payload: { sprintId, name } }),

  cloneSprint: (sprintId) => ({
    type: ActionTypes.CLONE_SPRINT,
    payload: { sprintId, newSprintId: createId('sprint'), taskIdPrefix: createId('t') },
  }),

  moveSprint: (sourceIndex, targetIndex) => ({
    type: ActionTypes.MOVE_SPRINT,
    payload: { sourceIndex, targetIndex },
  }),

  /** Agrega una tarea en blanco, o a partir de una plantilla del banco rápido. */
  addTask: (sprintId, template = null) => ({
    type: ActionTypes.ADD_TASK,
    payload: { sprintId, taskId: createId('t'), template },
  }),

  updateTask: (sprintId, taskId, field, value) => ({
    type: ActionTypes.UPDATE_TASK,
    payload: { sprintId, taskId, field, value },
  }),

  setRealDates: (sprintId, taskId, realStart, realEnd) => ({
    type: ActionTypes.SET_REAL_DATES,
    payload: { sprintId, taskId, realStart, realEnd },
  }),

  removeTask: (sprintId, taskId) => ({ type: ActionTypes.REMOVE_TASK, payload: { sprintId, taskId } }),

  moveTask: ({ taskId, sourceSprintId, targetSprintId, targetIndex }) => ({
    type: ActionTypes.MOVE_TASK,
    payload: { taskId, sourceSprintId, targetSprintId, targetIndex },
  }),

  setIntegrationConfig: (config) => ({
    type: ActionTypes.SET_INTEGRATION_CONFIG,
    payload: config,
  }),

  updateExternalIds: (sprintId, sprintExternalId, taskUpdates) => ({
    type: ActionTypes.UPDATE_EXTERNAL_IDS,
    payload: { sprintId, sprintExternalId, taskUpdates },
  }),

  cacheIssueComments: (entries) => ({
    type: ActionTypes.CACHE_ISSUE_COMMENTS,
    payload: entries,
  }),

  setProductDeliverySprint: (sprintId) => ({
    type: ActionTypes.SET_PRODUCT_DELIVERY_SPRINT,
    payload: { sprintId },
  }),
};

/** Enlaza cada acción con `dispatch` para exponer funciones listas para usar. */
export const bindProjectActions = (dispatch) =>
  Object.fromEntries(
    Object.entries(projectActions).map(([name, create]) => [name, (...args) => dispatch(create(...args))]),
  );
