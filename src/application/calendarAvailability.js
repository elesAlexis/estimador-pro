/** Publica únicamente la solicitud vigente; el consumidor compara además su rango. */
export function createCalendarLoader(provider) {
  let version = 0;
  return {
    load(startYear, endYear, publish) {
      const request = ++version;
      const key = `${startYear}:${endYear}`;
      Promise.resolve().then(() => provider.getHolidaysForRange(startYear, endYear))
        .then(calendar => { if (request === version) publish({ key, calendar, error: false }); })
        .catch(() => { if (request === version) publish({ key, calendar: null, error: true }); });
      return () => { if (request === version) version++; };
    },
  };
}

export function getCalendarAvailability(result, key) {
  if (!key) return 'error';
  if (result?.key !== key) return 'loading';
  return result.error || !result.calendar?.holidaySet?.size ? 'error' : 'ready';
}
