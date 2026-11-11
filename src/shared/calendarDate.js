/**
 * Fechas de calendario (días civiles "YYYY-MM-DD") — utilidades puras
 * compartidas por todas las capas.
 */

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parsea fechas de calendario sin convertirlas a UTC.
 *
 * Los valores de <input type="date"> representan un día civil, no un instante.
 * `new Date('YYYY-MM-DD')` los interpreta como medianoche UTC y puede cambiar el
 * día mostrado en zonas horarias como Colombia. Esta función los crea en la hora
 * local para conservar exactamente el día elegido por la persona usuaria.
 */
export const parseCalendarDate = (value) => {
  if (value instanceof Date) return new Date(value.getTime());
  if (typeof value !== 'string') return new Date(NaN);

  const match = DATE_ONLY_PATTERN.exec(value);
  if (match) {
    const [, year, month, day] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day));

    // Evita que fechas imposibles, como 2026-02-30, se normalicen en silencio.
    if (
      date.getFullYear() === Number(year) &&
      date.getMonth() === Number(month) - 1 &&
      date.getDate() === Number(day)
    ) {
      return date;
    }
    return new Date(NaN);
  }

  return new Date(value);
};

export const isValidCalendarDate = (value) => {
  const date = parseCalendarDate(value);
  return !Number.isNaN(date.getTime());
};

/** Convierte una fecha local a la clave estable YYYY-MM-DD. */
export const toDateKey = (value) => {
  const date = parseCalendarDate(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** Desplaza una fecha `days` días de calendario y devuelve su clave YYYY-MM-DD ('' si es inválida). */
export const shiftDateKey = (value, days) => {
  const date = parseCalendarDate(value);
  if (Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + days);
  return toDateKey(date);
};

export const formatDate = (value) => {
  if (!value) return '';
  const date = parseCalendarDate(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

export const isWeekend = (value) => {
  const date = parseCalendarDate(value);
  return !Number.isNaN(date.getTime()) && (date.getDay() === 0 || date.getDay() === 6);
};

/** Diferencia entre días civiles, inmune a cambios de horario de verano. */
export const getCalendarDayDifference = (start, end) => {
  const startDate = parseCalendarDate(start);
  const endDate = parseCalendarDate(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;

  const startUtc = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const endUtc = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  return Math.round((endUtc - startUtc) / (24 * 60 * 60 * 1000));
};
