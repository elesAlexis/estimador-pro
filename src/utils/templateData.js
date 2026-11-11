/**
 * Tema visual de los catálogos de negocio.
 *
 * Las claves y las etiquetas viven en `domain/taskCatalog.js`; aquí solo se les
 * agrega color, clase CSS y emoji. La mezcla se construye recorriendo el
 * catálogo del dominio, así que el ORDEN de las claves lo manda el dominio y no
 * puede desincronizarse (lo verifica `templateData.test.js`).
 */
import { PRIORITY_LABELS, PROJECT_STATUS_LABELS, TASK_TYPE_LABELS } from '../domain/taskCatalog';

const TASK_TYPE_THEME = {
  dev: { color: '#718e9f', bgClass: 'task-type-dev' },
  review: { color: '#968a9c', bgClass: 'task-type-review' },
  deploy: { color: '#81968a', bgClass: 'task-type-deploy' },
  qa: { color: '#aa977e', bgClass: 'task-type-qa' },
};

const PRIORITY_THEME = {
  alta:  { icon: '🔴', color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
  media: { icon: '🟡', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  baja:  { icon: '⚪', color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' },
};

const PROJECT_STATUS_ICON = {
  planeacion: '📋',
  en_curso: '🚀',
  en_pausa: '⏸️',
  finalizado: '✅',
};

/** Une la etiqueta del dominio con su tema, conservando el orden del catálogo. */
const withTheme = (labels, theme) =>
  Object.fromEntries(Object.entries(labels).map(([key, label]) => [key, { label, ...theme[key] }]));

export const TASK_TYPES = withTheme(TASK_TYPE_LABELS, TASK_TYPE_THEME);

export const PRIORITY_CONFIG = withTheme(PRIORITY_LABELS, PRIORITY_THEME);

export const PROJECT_STATUS = Object.entries(PROJECT_STATUS_LABELS)
  .map(([value, label]) => ({ value, label: `${PROJECT_STATUS_ICON[value]} ${label}` }));

export const ROLE_COLORS = {
  'Líder Técnico': '#596b80',
  'DevOps': '#81968a',
  'Backend': '#628f95',
  'Frontend': '#9b8aa5',
  'Fullstack': '#b28e85',
  'QA': '#aa977e',
  'Product Owner': '#969c76',
  'Desarrollador': '#8fa9bf',
};
