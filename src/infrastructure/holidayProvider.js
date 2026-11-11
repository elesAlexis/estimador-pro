/**
 * Proveedor de festivos colombianos con enfoque híbrido:
 * 1. Cache en almacenamiento para evitar llamadas repetidas (30 días)
 * 2. API Nager.Date como fuente preferida cuando hay conexión
 * 3. Cálculo local del dominio (domain/holidays) como respaldo, siempre disponible
 *
 * Implementa el puerto HolidayProvider (application/ports.js). Sus dependencias
 * externas (fetch, almacenamiento y reloj) se inyectan para poder probarlo.
 */
import { calculateColombianHolidays } from '../domain/holidays';
import { getBrowserStorage } from './browserStorage';
import { isValidCalendarDate } from '../shared/calendarDate';

const validHolidays = (entries, year) => Array.isArray(entries) && entries.length > 0 && entries.every(h =>
  h && typeof h.date === 'string' && h.date.startsWith(`${year}-`) && /^\d{4}-\d{2}-\d{2}$/.test(h.date) &&
  isValidCalendarDate(h.date) && typeof h.name === 'string' && h.name.trim());

const NAGER_API = 'https://date.nager.at/api/v3/PublicHolidays';
const CACHE_KEY_PREFIX = 'ep_holidays_';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const API_TIMEOUT_MS = 5000;

/**
 * @param {Object} [deps]
 * @param {typeof fetch|null} [deps.fetchFn]
 * @param {Storage|null} [deps.storage]
 * @param {() => number} [deps.now]
 * @returns {import('../application/ports').HolidayProvider & { getHolidaysForYear: Function }}
 */
export function createHolidayProvider({
  fetchFn = globalThis.fetch ? globalThis.fetch.bind(globalThis) : null,
  storage = getBrowserStorage(),
  now = () => Date.now(),
} = {}) {
  /** Festivos desde la API Nager.Date, o null si falla (se usará el cálculo local). */
  async function fetchFromApi(year) {
    if (!fetchFn) return null;
    try {
      const response = await fetchFn(`${NAGER_API}/${year}/CO`, {
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (!Array.isArray(data)) return null;
      const holidays = data.map((h) => ({ date: h?.date, name: h?.localName || h?.name, type: 'api' }));
      return validHolidays(holidays, year) ? holidays : null;
    } catch {
      return null;
    }
  }

  function readCache(year) {
    if (!storage) return null;
    try {
      const cached = storage.getItem(`${CACHE_KEY_PREFIX}${year}`);
      if (!cached) return null;
      const parsed = JSON.parse(cached);
      const isFresh = Number.isFinite(parsed.timestamp) && now() >= parsed.timestamp && now() - parsed.timestamp < CACHE_TTL_MS;
      return isFresh && validHolidays(parsed.holidays, year) ? parsed.holidays : null;
    } catch {
      return null;
    }
  }

  function writeCache(year, holidays, source) {
    if (!storage) return;
    try {
      storage.setItem(`${CACHE_KEY_PREFIX}${year}`, JSON.stringify({ holidays, source, timestamp: now() }));
    } catch { /* almacenamiento lleno o bloqueado: se ignora */ }
  }

  /** @returns {Promise<{holidays: Array, source: 'cache'|'api'|'local'}>} */
  async function getHolidaysForYear(year) {
    const cached = readCache(year);
    if (cached) return { holidays: cached, source: 'cache' };

    const apiHolidays = await fetchFromApi(year);
    const holidays = apiHolidays || calculateColombianHolidays(year);
    const source = apiHolidays ? 'api' : 'local';

    writeCache(year, holidays, source);
    return { holidays, source };
  }

  /** Festivos de un rango de años como Set "YYYY-MM-DD" (consulta O(1)) y lista con nombres. */
  async function getHolidaysForRange(startYear, endYear) {
    const holidayList = [];
    let source = 'local';

    for (let year = startYear; year <= endYear; year++) {
      const result = await getHolidaysForYear(year);
      holidayList.push(...result.holidays);
      if (result.source === 'api') source = 'api';
      else if (result.source === 'cache' && source !== 'api') source = 'cache';
    }

    return { holidaySet: new Set(holidayList.map((h) => h.date)), holidayList, source };
  }

  return { getHolidaysForYear, getHolidaysForRange };
}
