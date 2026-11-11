import { it } from 'node:test';
import assert from 'node:assert/strict';
import { createCalendarLoader, getCalendarAvailability } from './calendarAvailability';
import { calculateSprintDates } from '../domain/schedule';
import { calculateColombianHolidays } from '../domain/holidays';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
it('no acepta un calendario anterior ni vacío',()=>{
  assert.equal(getCalendarAvailability(null,'2026:2027'),'loading');
  assert.equal(getCalendarAvailability({key:'2025:2026'},'2026:2027'),'loading');
  assert.equal(getCalendarAvailability({key:'2026:2027',calendar:{holidaySet:new Set()}},'2026:2027'),'error');
});
it('ignora respuestas fuera de orden y solicitudes canceladas',async()=>{
  const resolvers=[], results=[];
  const loader=createCalendarLoader({getHolidaysForRange:()=>new Promise(resolve=>resolvers.push(resolve))});
  loader.load(2026,2027,r=>results.push(r));
  const cancel=loader.load(2028,2029,r=>results.push(r));
  await flush();
  resolvers[1]({holidaySet:new Set(['2028-01-01'])}); await flush();
  resolvers[0]({holidaySet:new Set(['2026-01-01'])}); await flush();
  assert.deepEqual(results.map(r=>r.key),['2028:2029']);
  cancel();
  const stop=loader.load(2030,2031,r=>results.push(r)); await flush(); stop();
  resolvers[2]({}); await flush();
  assert.equal(results.length,1);
});
it('comunica fallo de proveedor y calcula Navidad con el calendario resuelto',async()=>{
  const loader=createCalendarLoader({getHolidaysForRange:()=>Promise.reject(new Error('fallo'))});
  let result;loader.load(2026,2027,r=>result=r);await flush();
  assert.equal(getCalendarAvailability(result,'2026:2027'),'error');
  const set=new Set(calculateColombianHolidays(2026).map(h=>h.date));
  assert.equal(calculateSprintDates([{tasks:[{duration:1}]}],'2026-12-25',set)[0].tasks[0].calculatedStart,'2026-12-28');
});
