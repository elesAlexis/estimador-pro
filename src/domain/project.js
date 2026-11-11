/**
 * Reglas del proyecto.
 */
import { toDateKey } from '../shared/calendarDate';
import { publicIntegration } from './integration';

/** Información de un proyecto nuevo que inicia en `today`. */
export const createDefaultProjectInfo = (today = new Date()) => ({
  name: 'Nuevo Proyecto',
  client: '',
  startDate: toDateKey(today),
  manager: '',
  status: 'planeacion',
  integration: publicIntegration(),
});

/** Aplica las reglas fijas del proyecto a cualquier cambio de su información. */
export const applyProjectRules = (info) => ({ ...info, ...(info.integration ? { integration: publicIntegration(info.integration) } : {}) });
