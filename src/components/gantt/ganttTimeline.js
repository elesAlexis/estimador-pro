/**
 * Cálculos puros de la línea de tiempo del Gantt: qué días se muestran, cómo se
 * agrupan por mes y en qué columnas cae cada barra.
 */
import { getCalendarDayDifference, isWeekend, parseCalendarDate } from '../../shared/calendarDate';
import { isHoliday } from '../../domain/holidays';

export const GANTT_CELL_WIDTH = 32;

const DAYS_BEFORE = 2;
const DAYS_AFTER = 7;

/** Columnas de la grilla: nombre de la tarea + una columna por día. */
export const ganttGridColumns = (totalDays) =>
  `var(--gantt-label-width, 250px) repeat(${totalDays}, var(--gantt-day-width, ${GANTT_CELL_WIDTH}px))`;

/** Colores de cada tipo de día en el encabezado y en el fondo de la grilla. */
export const DAY_STYLES = {
  holiday: { bg: 'var(--color-danger-bg)', color: 'var(--color-danger-strong)' },
  weekend: { bg: 'var(--color-surface-muted)', color: 'var(--color-text-placeholder)' },
  workday: { bg: 'transparent', color: 'var(--color-text-secondary)' },
};

/** Clasifica un día; un festivo gana sobre el fin de semana. */
export function getDayKind(date, holidaySet) {
  if (isHoliday(date, holidaySet)) return 'holiday';
  if (isWeekend(date)) return 'weekend';
  return 'workday';
}

const EMPTY_TIMELINE = { dates: [], minDate: null, totalDays: 0 };

/**
 * Días que muestra el Gantt: desde 2 días antes de la primera fecha (programada
 * o real) hasta 7 días después de la última, partiendo de la fecha de inicio.
 */
export function buildGanttTimeline(sprints, startDate) {
  if (!sprints.length || !startDate) return EMPTY_TIMELINE;

  const initialDate = parseCalendarDate(startDate);
  if (Number.isNaN(initialDate.getTime())) return EMPTY_TIMELINE;

  let minDate = new Date(initialDate);
  let maxDate = new Date(initialDate);

  sprints.forEach((sprint) => {
    sprint.tasks.forEach((task) => {
      [task.calculatedStart, task.calculatedEnd, task.realStart, task.realEnd].forEach((value) => {
        const date = value ? parseCalendarDate(value) : null;
        if (date && !Number.isNaN(date.getTime()) && date < minDate) minDate = date;
      });
      [task.calculatedStart, task.calculatedEnd, task.realStart, task.realEnd].forEach((value) => {
        const date = value ? parseCalendarDate(value) : null;
        if (date && !Number.isNaN(date.getTime()) && date > maxDate) maxDate = date;
      });
    });
  });

  const first = new Date(minDate);
  first.setDate(first.getDate() - DAYS_BEFORE);
  const last = new Date(maxDate);
  last.setDate(last.getDate() + DAYS_AFTER);

  const dates = [];
  for (const current = new Date(first); current <= last; current.setDate(current.getDate() + 1)) {
    dates.push(new Date(current));
  }

  return { dates, minDate: first, totalDays: dates.length };
}

/** Agrupa los días por mes para el encabezado superior: [{ name, span }]. */
export function groupDatesByMonth(dates) {
  const months = [];
  dates.forEach((date) => {
    const name = date.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
    const last = months[months.length - 1];
    if (last && last.name === name) last.span += 1;
    else months.push({ name, span: 1 });
  });
  return months;
}

/** Columna del día (1 = primer día de la línea de tiempo) para una clave YYYY-MM-DD. */
export function getDayColumn(minDate, dateKey) {
  if (!dateKey || !minDate) return 1;
  const date = parseCalendarDate(dateKey);
  if (Number.isNaN(date.getTime())) return 1;
  return Math.max(1, getCalendarDayDifference(minDate, date) + 1);
}

/** Columna inicial y cantidad de días que ocupa una barra entre dos fechas. */
export function getBarPlacement(minDate, start, end) {
  const startCol = getDayColumn(minDate, start);
  const endCol = getDayColumn(minDate, end);
  return { startCol, span: Math.max(1, endCol - startCol + 1) };
}

/** No inventar fechas reales ni dibujar rangos incompletos o invertidos. */
export function getTaskRanges(task) {
  const range = (start, end) => {
    if (!start || !end) return null;
    const first = parseCalendarDate(start);
    const last = parseCalendarDate(end);
    return !Number.isNaN(first.getTime()) && !Number.isNaN(last.getTime()) && first <= last
      ? { start, end } : null;
  };
  return {
    planned: range(task.calculatedStart, task.calculatedEnd),
    actual: range(task.realStart, task.realEnd),
  };
}

export function getScheduleComparison(task) {
  const { planned, actual } = getTaskRanges(task);
  if (!planned || !actual) return { differs: false, label: '' };
  const differs = planned.start !== actual.start || planned.end !== actual.end;
  const endDelta = getCalendarDayDifference(planned.end, actual.end);
  const label = !differs ? 'Fechas confirmadas según lo programado'
    : endDelta > 0 ? `Fin: ${endDelta} días calendario después`
    : endDelta < 0 ? `Fin: ${Math.abs(endDelta)} días calendario antes`
    : 'Inicio diferente; fin según lo programado';
  return { differs, label };
}
