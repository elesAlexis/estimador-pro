/**
 * Por qué no se puede exportar todavía. Cadena vacía significa «se puede».
 * El orden importa: se informa el primer obstáculo, no todos a la vez.
 */
export function exportDisabledReason({ hasValidStartDate, invalidTaskCount, calendarReady, holidaySource, totalTasks }) {
  if (!hasValidStartDate) return 'Corrige la fecha de inicio.';
  if (invalidTaskCount) return 'Completa las duraciones pendientes antes de exportar.';
  if (!calendarReady) {
    return holidaySource === 'loading'
      ? 'Espera a que termine de cargar el calendario.'
      : 'El calendario no está disponible.';
  }
  if (!totalTasks) return 'Agrega al menos una tarea para exportar.';
  return '';
}
