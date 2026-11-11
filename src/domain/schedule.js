/**
 * Cronograma — reglas de días hábiles y cálculo en cascada de sprints y tareas.
 *
 * Las tareas se ejecutan en secuencia estricta a través de todos los sprints:
 * cada una empieza el siguiente día hábil después de que termina la anterior.
 */
import { parseCalendarDate, toDateKey } from '../shared/calendarDate';

/** Una duración válida es un número entero de días hábiles mayor que cero. */
export const isValidDuration = (value) => {
  const duration = Number(value);
  return Number.isInteger(duration) && duration > 0;
};

/** Verifica si una fecha es día no laborable (fin de semana o festivo). */
const isNonWorkingDay = (date, holidaySet) => {
  const day = date.getDay();
  if (day === 0 || day === 6) return true;
  return Boolean(holidaySet?.has(toDateKey(date)));
};

/** Suma días hábiles a una fecha local. */
export const addBusinessDays = (startDate, daysToAdd, holidaySet = null) => {
  const currentDate = parseCalendarDate(startDate);
  if (Number.isNaN(currentDate.getTime())) return currentDate;

  const days = Math.max(0, Math.trunc(Number(daysToAdd) || 0));
  let addedDays = 0;

  while (addedDays < days) {
    currentDate.setDate(currentDate.getDate() + 1);
    if (!isNonWorkingDay(currentDate, holidaySet)) addedDays++;
  }

  return currentDate;
};

/** Días hábiles del intervalo, ambos extremos incluidos. */
export const countBusinessDays = (start, end, holidaySet = null) => {
  const date = parseCalendarDate(start), last = parseCalendarDate(end);
  if (Number.isNaN(date.getTime()) || Number.isNaN(last.getTime())) return 0;
  let days = 0;
  for (; date <= last; date.setDate(date.getDate() + 1)) {
    if (!isNonWorkingDay(date, holidaySet)) days++;
  }
  return days;
};

/** Avanza una fecha al siguiente día hábil. */
const ensureBusinessDay = (date, holidaySet = null) => {
  const nextBusinessDay = parseCalendarDate(date);
  if (Number.isNaN(nextBusinessDay.getTime())) return nextBusinessDay;

  while (isNonWorkingDay(nextBusinessDay, holidaySet)) {
    nextBusinessDay.setDate(nextBusinessDay.getDate() + 1);
  }

  return nextBusinessDay;
};

const withoutCalculatedDates = (task) => ({
  ...task,
  calculatedStart: null,
  calculatedEnd: null,
});

/**
 * La tarea importada conserva su fecha remota. `remoteEnd` lo proyecta
 * `application/gitlab/remoteFields.js`; la PRESENCIA del campo distingue «el
 * rastreador dice que no hay fecha» de «no hay dato remoto».
 */
export const importedTaskDates = task => ({ ...task,
  calculatedStart: task.plannedStart || null,
  calculatedEnd: Object.hasOwn(task, 'remoteEnd') ? task.remoteEnd || null : task.plannedEnd || null,
});

/**
 * Calcula fechas de sprints en cascada y conserva los días civiles como YYYY-MM-DD.
 * Las tareas sin una duración positiva se dejan sin fechas para no presentar una
 * estimación engañosa ni detener el renderizado.
 */
export const calculateSprintDates = (sprints, startDate, holidaySet = null) => {
  const initialDate = parseCalendarDate(startDate);

  if (Number.isNaN(initialDate.getTime())) {
    return sprints.map((sprint) => ({
      ...sprint,
      sprintStart: sprint.plannedStart || null,
      sprintEnd: sprint.plannedEnd || null,
      tasks: sprint.tasks.map(task => task.scheduleMode === 'imported' ? importedTaskDates(task) : withoutCalculatedDates(task)),
    }));
  }

  let currentGlobalDate = ensureBusinessDay(initialDate, holidaySet);

  return sprints.map((sprint) => {
    const sprintStartDate = new Date(currentGlobalDate);
    let sprintEndDate = new Date(sprintStartDate);

    const calculatedTasks = sprint.tasks.map((task) => {
      if (task.scheduleMode === 'imported') return importedTaskDates(task);
      if (!isValidDuration(task.duration)) return withoutCalculatedDates(task);

      const taskStartDate = ensureBusinessDay(currentGlobalDate, holidaySet);
      const duration = Number(task.duration);
      const taskEndDate = addBusinessDays(taskStartDate, duration - 1, holidaySet);

      currentGlobalDate = addBusinessDays(taskEndDate, 1, holidaySet);
      sprintEndDate = new Date(taskEndDate);

      return {
        ...task,
        calculatedStart: toDateKey(taskStartDate),
        calculatedEnd: toDateKey(taskEndDate),
      };
    });

    return {
      ...sprint,
      tasks: calculatedTasks,
      sprintStart: sprint.plannedStart || calculatedTasks.map(t => t.calculatedStart).filter(Boolean).sort()[0] || toDateKey(sprintStartDate),
      sprintEnd: sprint.plannedEnd || calculatedTasks.map(t => t.calculatedEnd).filter(Boolean).sort().at(-1) || toDateKey(sprintEndDate),
    };
  });
};
