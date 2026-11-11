/**
 * Métricas del proyecto — reglas únicas de duración y progreso.
 *
 * Solo cuentan las duraciones válidas (enteros mayores que cero), igual que el
 * cronograma: una tarea que no recibe fechas tampoco suma días.
 */
import { isValidDuration } from './schedule';

/** Días hábiles que aporta una tarea (0 si su duración es inválida). */
export const getTaskDuration = (task) => (isValidDuration(task.duration) ? Number(task.duration) : 0);

/** Porcentaje de avance de una tarea, acotado entre 0 y 100. */
export const getTaskProgress = (task) => {
  const progress = Number.parseInt(task.progress, 10);
  if (Number.isNaN(progress)) return 0;
  return Math.min(100, Math.max(0, progress));
};

export const sumDurations = (tasks) => tasks.reduce((total, task) => total + getTaskDuration(task), 0);

export const isTaskComplete = task => getTaskProgress(task) === 100;
export const getSprintCompletion = tasks => ({
  completed: tasks.filter(isTaskComplete).length,
  isComplete: tasks.length > 0 && tasks.every(isTaskComplete),
});

/**
 * Progreso ponderado por duración (0–100): una tarea de 10 días pesa más que
 * una de 1. Es la misma regla para un sprint y para el proyecto completo.
 */
export const calculateProgress = (tasks) => {
  const totalDays = sumDurations(tasks);
  if (totalDays === 0) return tasks.length && tasks.every(task => task.scheduleMode === 'imported')
    ? Math.round(tasks.reduce((sum, task) => sum + getTaskProgress(task), 0) / tasks.length) : 0;

  const completedDays = tasks.reduce(
    (total, task) => total + getTaskDuration(task) * (getTaskProgress(task) / 100),
    0,
  );
  return Math.round((completedDays / totalDays) * 100);
};

/** Totales del proyecto a partir de los sprints ya calculados (con `calculatedEnd`). */
export const calculateProjectTotals = (calculatedSprints) => {
  const tasks = calculatedSprints.flatMap((sprint) => sprint.tasks);
  const deliveryIndex = calculatedSprints.findIndex(sprint => sprint.productDelivery);
  const productSprints = deliveryIndex >= 0 ? calculatedSprints.slice(0, deliveryIndex + 1) : calculatedSprints;
  const productTasks = productSprints.flatMap(sprint => sprint.tasks);
  const roleDistribution = {};
  const typeDistribution = {};
  let operationalEstimatedEndDate = null;

  tasks.forEach((task) => {
    const duration = getTaskDuration(task);
    roleDistribution[task.role] = (roleDistribution[task.role] || 0) + duration;
    typeDistribution[task.type] = (typeDistribution[task.type] || 0) + duration;

    // Las fechas son claves YYYY-MM-DD: comparar el texto respeta el orden cronológico.
    if (task.calculatedEnd && (!operationalEstimatedEndDate || task.calculatedEnd > operationalEstimatedEndDate)) {
      operationalEstimatedEndDate = task.calculatedEnd;
    }
  });
  const estimatedEndDate = productTasks.reduce((latest, task) => task.calculatedEnd && (!latest || task.calculatedEnd > latest) ? task.calculatedEnd : latest, null);
  const deliverySprint = deliveryIndex >= 0 ? calculatedSprints[deliveryIndex] : null;

  return {
    totalDays: sumDurations(tasks),
    totalTasks: tasks.length,
    totalSprints: calculatedSprints.length,
    roleDistribution,
    typeDistribution,
    estimatedEndDate,
    operationalEstimatedEndDate,
    globalProgress: calculateProgress(productTasks),
    operationalProgress: calculateProgress(tasks),
    productDays: sumDurations(productTasks),
    productTasks: productTasks.length,
    productSprints: productSprints.length,
    postDeliverySprints: Math.max(0, calculatedSprints.length - productSprints.length),
    productDeliverySprintId: deliverySprint?.id || null,
    productDeliverySprintName: deliverySprint?.name || '',
  };
};
