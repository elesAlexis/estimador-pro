import { useEffect, useMemo, useState } from 'react';
import { createCalendarLoader, getCalendarAvailability } from '../application/calendarAvailability';

const EMPTY_SET = new Set();
const EMPTY_LIST = [];

export function useProjectCalendar(provider, startYear, endYear) {
  const loader = useMemo(() => createCalendarLoader(provider), [provider]);
  const [result, setResult] = useState(null);
  const key = startYear === null ? null : `${startYear}:${endYear}`;
  useEffect(() => {
    if (!key) return;
    return loader.load(startYear, endYear, setResult);
  }, [loader, key, startYear, endYear]);
  const availability = getCalendarAvailability(result, key);
  const calendar = availability === 'ready' ? result.calendar : null;
  return useMemo(() => ({
    holidaySet: calendar?.holidaySet ?? EMPTY_SET,
    holidayList: calendar?.holidayList ?? EMPTY_LIST,
    holidaySource: calendar?.source ?? availability,
    holidayCount: calendar?.holidaySet.size ?? 0,
    calendarReady: availability === 'ready',
  }), [calendar, availability]);
}
