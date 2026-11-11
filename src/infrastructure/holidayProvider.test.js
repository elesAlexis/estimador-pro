import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHolidayProvider } from './holidayProvider';

const createMemoryStorage = () => {
  const data = new Map();
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
  };
};

const apiResponse = [{ date: '2026-01-01', localName: 'Año Nuevo', name: "New Year's Day" }];

const createFetch = (behavior) => {
  const calls = [];
  const fetchFn = async (url) => {
    calls.push(url);
    return behavior(url);
  };
  return { fetchFn, calls };
};

const okFetch = () => createFetch(() => ({ ok: true, json: async () => apiResponse }));

describe('createHolidayProvider', () => {
  it('usa la API cuando responde y guarda el resultado en cache', async () => {
    const storage = createMemoryStorage();
    const { fetchFn, calls } = okFetch();
    const provider = createHolidayProvider({ fetchFn, storage, now: () => 0 });

    const result = await provider.getHolidaysForYear(2026);

    assert.equal(result.source, 'api');
    assert.deepEqual(result.holidays, [{ date: '2026-01-01', name: 'Año Nuevo', type: 'api' }]);
    assert.match(calls[0], /\/2026\/CO$/);
    assert.ok(storage.data.has('ep_holidays_2026'));
  });

  it('responde desde cache sin llamar a la API mientras no expire', async () => {
    const storage = createMemoryStorage();
    const { fetchFn, calls } = okFetch();
    let time = 0;
    const provider = createHolidayProvider({ fetchFn, storage, now: () => time });

    await provider.getHolidaysForYear(2026);
    time = 29 * 24 * 60 * 60 * 1000;
    const cached = await provider.getHolidaysForYear(2026);
    assert.equal(cached.source, 'cache');
    assert.equal(calls.length, 1);

    time = 31 * 24 * 60 * 60 * 1000;
    const refreshed = await provider.getHolidaysForYear(2026);
    assert.equal(refreshed.source, 'api');
    assert.equal(calls.length, 2);
  });

  it('usa el cálculo local si la API falla', async () => {
    const { fetchFn } = createFetch(() => {
      throw new Error('sin red');
    });
    const provider = createHolidayProvider({ fetchFn, storage: createMemoryStorage() });

    const result = await provider.getHolidaysForYear(2026);
    assert.equal(result.source, 'local');
    assert.equal(result.holidays.length, 18);
  });

  it('usa el cálculo local si la API responde con error o datos inválidos', async () => {
    for (const response of [{ ok: false }, ...[{}, [], [null], [{date:'2026-02-30',name:'X'}], [{date:'2025-01-01',name:'X'}], [{date:'2026-01-01',name:{}}]].map(data => ({ok:true,json:async()=>data}))]) {
      const { fetchFn } = createFetch(() => response);
      const provider = createHolidayProvider({ fetchFn, storage: createMemoryStorage() });
      assert.equal((await provider.getHolidaysForYear(2026)).source, 'local');
    }
  });

  it('funciona sin fetch ni almacenamiento', async () => {
    const provider = createHolidayProvider({ fetchFn: null, storage: null });
    const result = await provider.getHolidaysForRange(2026, 2027);
    assert.equal(result.source, 'local');
    assert.equal(result.holidaySet.size, 36);
    assert.ok(result.holidaySet.has('2026-03-23'));
    assert.ok(result.holidaySet.has('2027-12-25'));
  });

  it('ignora una cache corrupta', async () => {
    const storage = createMemoryStorage();
    storage.setItem('ep_holidays_2026', '{no es json');
    const provider = createHolidayProvider({ fetchFn: null, storage });
    assert.equal((await provider.getHolidaysForYear(2026)).source, 'local');
  });
});
