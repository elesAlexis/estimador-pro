/**
 * Rango de años de festivos que hay que cargar para poder programar el proyecto.
 *
 * Se estira el doble de la duración total más un mes de margen, con un piso de
 * un año, porque las tareas se encadenan y los festivos empujan el final. Las
 * fechas ya importadas amplían el rango hacia atrás o hacia adelante.
 */
import { isValidCalendarDate, parseCalendarDate } from '../shared/calendarDate';
import { sumDurations } from './metrics';

const MARGEN_MINIMO_DIAS = 370;
const AÑO_MAXIMO = 9999;

const año = (fecha) => Number(fecha.slice(0, 4));

/** Devuelve `{ start, end }` en años, o null si no hay una fecha de inicio usable. */
export function calendarYearRange(startDate, sprints) {
  if (!isValidCalendarDate(startDate)) return null;
  const start = parseCalendarDate(startDate);
  const totalDays = sprints.reduce((total, sprint) => total + sumDurations(sprint.tasks), 0);
  const end = new Date(start);
  end.setDate(end.getDate() + Math.max(MARGEN_MINIMO_DIAS, totalDays * 2 + 31));
  if (!Number.isFinite(end.getTime()) || end.getFullYear() > AÑO_MAXIMO) return null;

  const importedDates = sprints
    .flatMap((sprint) => [sprint.plannedStart, sprint.plannedEnd,
      ...sprint.tasks.flatMap((task) => [task.plannedStart, task.plannedEnd, task.remoteEnd])])
    .filter(isValidCalendarDate)
    .map(año);

  return {
    start: Math.min(start.getFullYear(), ...importedDates),
    end: Math.max(end.getFullYear(), ...importedDates),
  };
}
