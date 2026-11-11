/**
 * Catálogos de negocio: qué tipos, prioridades y estados existen, y cómo se
 * llaman. Las CLAVES son datos de dominio — `projectValidation` las usa para
 * aceptar o rechazar una tarea, y viajan a GitLab dentro de las etiquetas.
 *
 * Aquí no hay colores, clases CSS ni emojis: el tema visual se les agrega en
 * `utils/templateData.js`, que es presentación.
 */

/** El orden define el de los <option> en el formulario de tarea. */
export const TASK_TYPE_LABELS = Object.freeze({
  dev: 'Desarrollo',
  review: 'Revisión',
  deploy: 'Despliegue',
  qa: 'Pruebas',
});

export const PRIORITY_LABELS = Object.freeze({
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
});

export const PROJECT_STATUS_LABELS = Object.freeze({
  planeacion: 'Planeación',
  en_curso: 'En Curso',
  en_pausa: 'En Pausa',
  finalizado: 'Finalizado',
});

export const isTaskType = (value) => Object.hasOwn(TASK_TYPE_LABELS, value);
export const isPriority = (value) => Object.hasOwn(PRIORITY_LABELS, value);
export const isProjectStatus = (value) => Object.hasOwn(PROJECT_STATUS_LABELS, value);
