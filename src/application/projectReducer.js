/**
 * Transiciones de estado de los sprints y sus tareas.
 *
 * Reducer puro: no genera IDs ni lee el reloj (eso lo hacen las acciones en
 * projectActions.js), así que el mismo estado y la misma acción siempre
 * producen el mismo resultado.
 */
import { getNextSprintName } from '../domain/sprints';
import { BASE_TEMPLATE } from '../domain/templates';
import { isValidSprintList, normalizeSprints } from './projectValidation';
import { applyProjectRules } from '../domain/project';
import { ActionTypes } from './projectActions';
import { publicIntegration } from '../domain/integration';

const NEW_TASK_DEFAULTS = {
  title: 'Nueva Tarea',
  role: 'Desarrollador',
  duration: 1,
  type: 'dev',
  priority: 'media',
  description: '',
  wbs: '',
  progress: 0,
};

const TEMPLATE_TASK_DEFAULTS = {
  priority: 'media',
  description: '',
  wbs: '',
  progress: 0,
};

const updateSprint = (state, sprintId, update) =>
  state.map((sprint) => (sprint.id === sprintId ? update(sprint) : sprint));

export function sprintReducer(state, action) {
  switch (action.type) {
    case ActionTypes.RECORD_REMOTE: {
      const { entry, remote } = action.payload;
      return updateSprint(state, entry.sprintId, sprint => entry.kind === 'milestone' ? { ...sprint, remote }
        : { ...sprint, tasks: sprint.tasks.map(task => task.id === entry.localId ? { ...task, remote } : task) });
    }
    case ActionTypes.RECALCULATE_IMPORTED:
      return state.map(sprint => ({ ...sprint, plannedStart: undefined, plannedEnd: undefined,
        tasks: sprint.tasks.map(task => ({ ...task, scheduleMode: 'automatic', plannedStart: '', plannedEnd: '' })) }));
    case ActionTypes.LOAD_SPRINTS:
      return isValidSprintList(action.payload) ? normalizeSprints(action.payload) : state;

    case ActionTypes.LOAD_TEMPLATE:
      return JSON.parse(JSON.stringify(BASE_TEMPLATE));

    case ActionTypes.ADD_SPRINT:
      return [...state, { id: action.payload.sprintId, name: getNextSprintName(state), tasks: [] }];

    case ActionTypes.REMOVE_SPRINT:
      return state.filter((sprint) => sprint.id !== action.payload.sprintId);

    case ActionTypes.RENAME_SPRINT: {
      const { sprintId, name } = action.payload;
      return updateSprint(state, sprintId, (sprint) => ({ ...sprint, name }));
    }

    case ActionTypes.CLONE_SPRINT: {
      const { sprintId, newSprintId, taskIdPrefix } = action.payload;
      const index = state.findIndex((sprint) => sprint.id === sprintId);
      if (index === -1) return state;

      const source = state[index];
      const clone = {
        ...source,
        remote: undefined, externalId: '', remoteGroup: false, productDelivery: false,
        id: newSprintId,
        name: `${source.name} (Copia)`,
        tasks: source.tasks.map((task, i) => ({ ...task, id: `${taskIdPrefix}-${i}`, remote: undefined, remoteComments: [], externalId: '', externalUrl: '' })),
      };
      return [...state.slice(0, index + 1), clone, ...state.slice(index + 1)];
    }

    case ActionTypes.MOVE_SPRINT: {
      const { sourceIndex, targetIndex } = action.payload;
      if (!Number.isInteger(sourceIndex) || !Number.isInteger(targetIndex) || sourceIndex < 0 || sourceIndex >= state.length || targetIndex < 0 || targetIndex >= state.length) return state;
      if (sourceIndex === targetIndex) return state;
      const newState = [...state];
      const [moved] = newState.splice(sourceIndex, 1);
      newState.splice(targetIndex, 0, moved);
      return newState;
    }

    case ActionTypes.ADD_TASK: {
      const { sprintId, taskId, template } = action.payload;
      const newTask = template
        ? { ...TEMPLATE_TASK_DEFAULTS, ...template, id: taskId }
        : { ...NEW_TASK_DEFAULTS, id: taskId };
      return updateSprint(state, sprintId, (sprint) => ({ ...sprint, tasks: [...sprint.tasks, newTask] }));
    }

    case ActionTypes.SET_REAL_DATES: {
      const { sprintId, taskId, realStart, realEnd } = action.payload;
      const source = state.find(s => s.id === sprintId);
      const original = source?.tasks.find(t => t.id === taskId);
      if (!original || !isValidSprintList([{ ...source, tasks: [{ ...original, realStart, realEnd }] }])) return state;
      return updateSprint(state, sprintId, sprint => ({ ...sprint,
        tasks: sprint.tasks.map(task => task.id === taskId ? { ...task, realStart, realEnd } : task),
      }));
    }

    case ActionTypes.UPDATE_TASK: {
      const { sprintId, taskId, field, value } = action.payload;
      if (!['title', 'role', 'duration', 'type', 'priority', 'description', 'observations', 'wbs', 'progress', 'realStart', 'realEnd', 'assigneeIds'].includes(field)) return state;
      const source = state.find(s => s.id === sprintId);
      const original = source?.tasks.find(t => t.id === taskId);
      if (!original || !isValidSprintList([{ ...source, tasks: [{ ...original, [field]: value }] }])) return state;
      return updateSprint(state, sprintId, (sprint) => ({
        ...sprint,
        tasks: sprint.tasks.map((task) => (task.id === taskId ? { ...task, [field]: value } : task)),
      }));
    }

    case ActionTypes.REMOVE_TASK: {
      const { sprintId, taskId } = action.payload;
      return updateSprint(state, sprintId, (sprint) => ({
        ...sprint,
        tasks: sprint.tasks.filter((task) => task.id !== taskId),
      }));
    }

    case ActionTypes.MOVE_TASK: {
      const { taskId, sourceSprintId, targetSprintId, targetIndex } = action.payload;
      const sourceSprint = state.find((sprint) => sprint.id === sourceSprintId);
      const task = sourceSprint?.tasks.find((t) => t.id === taskId);
      const targetSprint = state.find(s => s.id === targetSprintId);
      if (!task || !targetSprint || !Number.isInteger(targetIndex) || targetIndex < 0) return state;

      if (sourceSprintId === targetSprintId) {
        // Reordenar dentro del mismo sprint
        const tasks = sourceSprint.tasks.filter((t) => t.id !== taskId);
        tasks.splice(Math.min(targetIndex, tasks.length), 0, task);
        return updateSprint(state, sourceSprintId, (sprint) => ({ ...sprint, tasks }));
      }

      // Mover entre sprints
      let movedId = task.id;
      let suffix = 1;
      while (targetSprint.tasks.some(t => t.id === movedId)) movedId = `${task.id}-movida-${suffix++}`;
      return state.map((sprint) => {
        if (sprint.id === sourceSprintId) {
          return { ...sprint, tasks: sprint.tasks.filter((t) => t.id !== taskId) };
        }
        if (sprint.id === targetSprintId) {
          const tasks = [...sprint.tasks];
          tasks.splice(Math.min(targetIndex, tasks.length), 0, { ...task, id: movedId });
          return { ...sprint, tasks };
        }
        return sprint;
      });
    }

    case ActionTypes.UPDATE_EXTERNAL_IDS: {
      const { sprintId, sprintExternalId, taskUpdates } = action.payload;
      return updateSprint(state, sprintId, (sprint) => {
        const nextSprint = { ...sprint };
        if (sprintExternalId !== undefined) {
          nextSprint.externalId = sprintExternalId;
        }
        if (taskUpdates && Array.isArray(taskUpdates)) {
          nextSprint.tasks = sprint.tasks.map(task => {
            const update = taskUpdates.find(u => u.taskId === task.id);
            if (update) {
              return { ...task, externalId: update.externalId, externalUrl: update.externalUrl };
            }
            return task;
          });
        }
        return nextSprint;
      });
    }

    case ActionTypes.CACHE_ISSUE_COMMENTS: {
      if (!Array.isArray(action.payload)) return state;
      const byTask = new Map(action.payload.map(entry => [`${entry.sprintId}:${entry.taskId}`, entry.comments]));
      let changed = false;
      const next = state.map(sprint => ({ ...sprint, tasks: sprint.tasks.map(task => {
        const comments = byTask.get(`${sprint.id}:${task.id}`);
        if (comments === undefined || JSON.stringify(task.remoteComments || []) === JSON.stringify(comments)) return task;
        changed = true;
        return { ...task, remoteComments: comments };
      }) }));
      return changed && isValidSprintList(next) ? normalizeSprints(next) : state;
    }

    case ActionTypes.SET_PRODUCT_DELIVERY_SPRINT: {
      const selected = state.find(sprint => sprint.id === action.payload.sprintId);
      if (!selected) return state;
      const remove = Boolean(selected.productDelivery);
      return state.map(sprint => ({ ...sprint, productDelivery: remove ? false : sprint.id === selected.id }));
    }

    default:
      return state;
  }
}

/** Información y tareas cambian juntas al importar un proyecto validado. */
export function projectReducer(state, action) {
  if (action.type === ActionTypes.REPLACE_PROJECT) return { ...action.payload, announcement: 'Proyecto importado correctamente.' };
  if (action.type === ActionTypes.SET_PROJECT_INFO) return { ...state, projectInfo: applyProjectRules(action.payload) };
  if (action.type === ActionTypes.SET_INTEGRATION_CONFIG) {
    return {
      ...state,
      projectInfo: {
        ...state.projectInfo,
        integration: {
          ...publicIntegration(action.payload),
        }
      }
    };
  }
  const sprints = sprintReducer(state.sprints, action);
  if (sprints === state.sprints) return state;
  const moved = [ActionTypes.MOVE_TASK, ActionTypes.MOVE_SPRINT].includes(action.type);
  return { ...state, sprints, announcement: moved ? `Orden actualizado. ${state.announcement === 'Orden actualizado.' ? 'Movimiento completado.' : ''}` : '' };
}
