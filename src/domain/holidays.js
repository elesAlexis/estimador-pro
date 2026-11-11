/**
 * Festivos oficiales de Colombia — reglas puras del dominio.
 *
 * Basado en la Ley 51 de 1983 (Ley Emiliani) y el cálculo de Pascua. No usa red
 * ni almacenamiento: funciona offline y es la fuente de verdad que la
 * infraestructura (infrastructure/holidayProvider) solo enriquece.
 */
import { shiftDateKey, toDateKey } from '../shared/calendarDate';

// ============================================================
// ALGORITMO DE PASCUA (Meeus/Jones/Butcher)
// ============================================================

function getEasterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

// ============================================================
// LEY EMILIANI - Mover al siguiente lunes
// ============================================================

function addDaysToDate(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Si la fecha no cae en lunes, la mueve al siguiente lunes.
 * Ley 51 de 1983 (Ley Emiliani).
 */
function moveToNextMonday(date) {
  const d = new Date(date);
  const dayOfWeek = d.getDay(); // 0=Dom, 1=Lun, ..., 6=Sáb
  if (dayOfWeek === 1) return d; // Ya es lunes
  const daysToAdd = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
  d.setDate(d.getDate() + daysToAdd);
  return d;
}

// ============================================================
// CÁLCULO DE LOS 18 FESTIVOS COLOMBIANOS
// ============================================================

/**
 * Calcula los 18 festivos oficiales de Colombia para un año dado. Dos festivos
 * pueden caer el mismo día (p. ej. el 30 de junio de 2025).
 *
 * @param {number} year - Año (ej: 2026)
 * @returns {Array<{date: string, name: string, type: string}>}
 */
export function calculateColombianHolidays(year) {
  const easter = getEasterSunday(year);

  const holidays = [
    // ── Grupo 1: Fechas fijas (no se mueven) ──
    { date: toDateKey(new Date(year, 0, 1)),   name: 'Año Nuevo',                 type: 'fixed' },
    { date: toDateKey(new Date(year, 4, 1)),   name: 'Día del Trabajo',            type: 'fixed' },
    { date: toDateKey(new Date(year, 6, 20)),  name: 'Grito de Independencia',     type: 'fixed' },
    { date: toDateKey(new Date(year, 7, 7)),   name: 'Batalla de Boyacá',          type: 'fixed' },
    { date: toDateKey(new Date(year, 11, 8)),  name: 'Inmaculada Concepción',      type: 'fixed' },
    { date: toDateKey(new Date(year, 11, 25)), name: 'Navidad',                    type: 'fixed' },

    // ── Grupo 2: Fechas fijas → movidas al lunes (Ley Emiliani) ──
    { date: toDateKey(moveToNextMonday(new Date(year, 0, 6))),   name: 'Día de los Reyes Magos',    type: 'emiliani' },
    { date: toDateKey(moveToNextMonday(new Date(year, 2, 19))),  name: 'Día de San José',           type: 'emiliani' },
    { date: toDateKey(moveToNextMonday(new Date(year, 5, 29))),  name: 'San Pedro y San Pablo',     type: 'emiliani' },
    { date: toDateKey(moveToNextMonday(new Date(year, 7, 15))),  name: 'Asunción de la Virgen',     type: 'emiliani' },
    { date: toDateKey(moveToNextMonday(new Date(year, 9, 12))),  name: 'Día de la Raza',            type: 'emiliani' },
    { date: toDateKey(moveToNextMonday(new Date(year, 10, 1))),  name: 'Día de Todos los Santos',   type: 'emiliani' },
    { date: toDateKey(moveToNextMonday(new Date(year, 10, 11))), name: 'Independencia de Cartagena', type: 'emiliani' },

    // ── Grupo 3: Dependen de Pascua (fijos en día de semana) ──
    { date: toDateKey(addDaysToDate(easter, -3)), name: 'Jueves Santo',            type: 'easter' },
    { date: toDateKey(addDaysToDate(easter, -2)), name: 'Viernes Santo',           type: 'easter' },

    // ── Grupo 4: Dependen de Pascua → movidos al lunes (Ley Emiliani) ──
    { date: toDateKey(addDaysToDate(easter, 43)), name: 'Ascensión del Señor',     type: 'easter_emiliani' },
    { date: toDateKey(addDaysToDate(easter, 64)), name: 'Corpus Christi',          type: 'easter_emiliani' },
    { date: toDateKey(addDaysToDate(easter, 71)), name: 'Sagrado Corazón',         type: 'easter_emiliani' },
  ];

  return holidays.sort((a, b) => a.date.localeCompare(b.date));
}

// ============================================================
// CONSULTAS
// ============================================================

/**
 * Verifica si una fecha es festivo.
 *
 * @param {Date|string} date - Fecha a verificar
 * @param {Set<string>} holidaySet - Set de fechas festivas "YYYY-MM-DD"
 * @returns {boolean}
 */
export function isHoliday(date, holidaySet) {
  if (!holidaySet || holidaySet.size === 0) return false;
  const key = typeof date === 'string' ? date : toDateKey(date);
  return holidaySet.has(key);
}

/**
 * Busca el nombre del festivo para una fecha dada.
 *
 * @param {Date|string} date
 * @param {Array} holidayList - Lista de {date, name, type}
 * @returns {string|null}
 */
export function getHolidayName(date, holidayList) {
  if (!holidayList || !holidayList.length) return null;
  const key = typeof date === 'string' ? date : toDateKey(date);
  const found = holidayList.find(h => h.date === key);
  return found ? found.name : null;
}

/**
 * Festivos entre dos fechas (inclusive), ampliando el rango `marginDays` días de
 * calendario hacia cada lado. Sirve para avisar de festivos cerca de una tarea.
 *
 * @param {Array} holidayList - Lista de {date, name, type}
 * @param {string} start - Clave "YYYY-MM-DD"
 * @param {string} end - Clave "YYYY-MM-DD"
 * @param {number} [marginDays=0]
 * @returns {Array}
 */
export function getHolidaysNear(holidayList, start, end, marginDays = 0) {
  if (!holidayList?.length || !start || !end) return [];
  const from = shiftDateKey(start, -marginDays);
  const to = shiftDateKey(end, marginDays);
  if (!from || !to) return [];
  return holidayList.filter((h) => h.date >= from && h.date <= to);
}
