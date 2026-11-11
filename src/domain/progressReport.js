import { getCalendarDayDifference, isValidCalendarDate, parseCalendarDate, toDateKey } from '../shared/calendarDate';
import { calculateProgress, getSprintCompletion, getTaskProgress, sumDurations } from './metrics';
import { TASK_TYPE_LABELS } from './taskCatalog';

const validDates = values => values.filter(value => typeof value === 'string' && isValidCalendarDate(value)).sort();
const first = values => validDates(values)[0] || '';
const last = values => validDates(values).at(-1) || '';
const clamp = value => Math.max(0, Math.min(100, value));

/** `moduleLabel` lo proyecta la capa de integración; sin él vale el tipo de tarea. */
export const getTaskModule = task => task.moduleLabel || TASK_TYPE_LABELS[task.type] || 'Sin módulo';

export const getTaskReportStatus = (task, today) => {
  const progress = getTaskProgress(task);
  const end = task.plannedEnd || task.calculatedEnd || '';
  if (progress === 100) return { key: 'complete', label: 'Completada' };
  if (end && end < today) return { key: 'overdue', label: 'Vencida' };
  if (progress > 0) return { key: 'active', label: 'En curso' };
  return { key: 'pending', label: 'Pendiente' };
};

const sprintWindow = sprint => {
  const starts = [sprint.plannedStart, ...sprint.tasks.map(task => task.plannedStart || task.calculatedStart)];
  const ends = [sprint.plannedEnd, ...sprint.tasks.map(task => task.plannedEnd || task.calculatedEnd)];
  return { start: first(starts), end: last(ends) };
};

const sprintStatus = (sprint, start, end, today) => {
  const completion = getSprintCompletion(sprint.tasks);
  if (completion.isComplete) return { key: 'complete', label: 'Entregado' };
  if (end && end < today) return { key: 'overdue', label: 'Vencido' };
  if (start && start > today) return { key: 'pending', label: 'Pendiente' };
  if (start && end) return { key: 'active', label: 'En curso' };
  return { key: 'unscheduled', label: 'Sin fechas' };
};

/** Construye el mismo modelo de lectura que usan la pantalla de avance y su HTML exportado. */
export function buildProgressReport(projectInfo, calculatedSprints, totals, now = new Date()) {
  const today = toDateKey(now);
  const sprints = calculatedSprints.map((sprint, index) => {
    const { start, end } = sprintWindow(sprint);
    const completion = getSprintCompletion(sprint.tasks);
    const tasks = sprint.tasks.map(task => ({
      ...task,
      progress: getTaskProgress(task),
      module: getTaskModule(task),
      status: getTaskReportStatus(task, today),
      start: task.plannedStart || task.calculatedStart || '',
      end: task.plannedEnd || task.calculatedEnd || '',
    }));
    return {
      ...sprint,
      number: index + 1,
      start,
      end,
      duration: sumDurations(sprint.tasks),
      progress: calculateProgress(sprint.tasks),
      completedTasks: completion.completed,
      status: sprintStatus(sprint, start, end, today),
      tasks,
    };
  });
  const deliveryIndex = sprints.findIndex(sprint => sprint.productDelivery);
  const productSprints = deliveryIndex >= 0 ? sprints.slice(0, deliveryIndex + 1) : sprints;
  const productTasks = productSprints.flatMap(sprint => sprint.tasks);
  const start = first([projectInfo.startDate, ...sprints.map(sprint => sprint.start)]);
  const end = last(sprints.map(sprint => sprint.end));
  const productEnd = deliveryIndex >= 0 ? (sprints[deliveryIndex].end || totals.estimatedEndDate || '') : end;
  const duration = start && productEnd ? Math.max(1, getCalendarDayDifference(start, productEnd) + 1) : 0;
  const elapsed = start && productEnd ? clamp(Math.round(((getCalendarDayDifference(start, today) + 1) / duration) * 100)) : 0;
  const modules = new Map();
  productTasks.forEach(task => {
    const current = modules.get(task.module) || { name: task.module, tasks: 0, completed: 0, progressTotal: 0 };
    current.tasks += 1;
    current.completed += task.progress === 100 ? 1 : 0;
    current.progressTotal += task.progress;
    modules.set(task.module, current);
  });
  const moduleProgress = [...modules.values()].map(module => ({
    ...module,
    progress: Math.round(module.progressTotal / module.tasks),
  })).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return {
    project: projectInfo,
    today,
    start,
    end,
    productEnd,
    calendarElapsed: elapsed,
    totals: {
      ...totals,
      completedTasks: productTasks.filter(task => task.progress === 100).length,
      completedSprints: productSprints.filter(sprint => sprint.status.key === 'complete').length,
      scopeTasks: productTasks.length,
      scopeSprints: productSprints.length,
      overdueSprints: sprints.filter(sprint => sprint.status.key === 'overdue').length,
    },
    sprints,
    modules: moduleProgress,
  };
}

/** Posición porcentual inclusiva dentro del rango general del reporte. */
export function reportBarPlacement(report, start, end) {
  if (!report.start || !report.end || !start || !end) return null;
  const total = Math.max(1, getCalendarDayDifference(report.start, report.end) + 1);
  const offset = clamp((getCalendarDayDifference(report.start, start) / total) * 100);
  const width = Math.max(1.5, ((getCalendarDayDifference(start, end) + 1) / total) * 100);
  return { left: offset, width: Math.min(100 - offset, width) };
}

/** Segmentos mensuales y posición de hoy para el Gantt ejecutivo. */
export function buildReportTimeline(report) {
  if (!isValidCalendarDate(report.start) || !isValidCalendarDate(report.end) || report.end < report.start) {
    return { totalDays: 0, weekWidth: 0, months: [], today: null };
  }
  const rangeEnd = parseCalendarDate(report.end);
  const totalDays = getCalendarDayDifference(report.start, report.end) + 1;
  const months = [];
  let cursor = parseCalendarDate(report.start);
  while (cursor <= rangeEnd) {
    const start = toDateKey(cursor);
    const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    const segmentEnd = new Date(Math.min(rangeEnd.getTime(), nextMonth.getTime() - 86400000));
    const end = toDateKey(segmentEnd);
    const days = getCalendarDayDifference(start, end) + 1;
    months.push({
      key: `${cursor.getFullYear()}-${cursor.getMonth() + 1}`,
      label: cursor.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' }).replace('.', '').replace(/\s+de\s+/i, ' ').toUpperCase(),
      left: (getCalendarDayDifference(report.start, start) / totalDays) * 100,
      width: (days / totalDays) * 100,
    });
    cursor = nextMonth;
  }
  const today = report.today >= report.start && report.today <= report.end
    ? Number((((getCalendarDayDifference(report.start, report.today) + .5) / totalDays) * 100).toFixed(4))
    : null;
  return { totalDays, weekWidth: Math.min(100, (7 / totalDays) * 100), months, today };
}
