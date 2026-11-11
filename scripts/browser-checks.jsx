// Banco manual de integración. Solo memoria: nunca escribe en localStorage.
import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ProjectProvider } from '../src/context/ProjectContext';
import { createLocalStorageProjectRepository } from '../src/infrastructure/localStorageProjectRepository';
import { calculateColombianHolidays } from '../src/domain/holidays';
import { createDefaultProjectInfo } from '../src/domain/project';
import Header from '../src/components/Header';
import PersistenceNotice from '../src/components/PersistenceNotice';
import EstimatorPage from '../src/pages/EstimatorPage';
import '../src/index.css';

function scenarioFor(name) {
  const data = new Map([
    ['ep_projectInfo', JSON.stringify({ ...createDefaultProjectInfo(), name: 'Prueba en memoria', startDate: '2026-12-25' })],
    ['ep_sprints', name === 'corrupto' ? '{original corrupto' : JSON.stringify([{ id: 's', name: 'Prueba', tasks: [{ id: 't', title: 'Entrega', duration: 1 }] }])],
  ]);
  let quota = name === 'cuota', blocked = name === 'bloqueado', writes = 0;
  const pending = [];
  const repository = createLocalStorageProjectRepository({
    getItem(key) { if (blocked) throw new Error('Lectura bloqueada'); return data.get(key) ?? null; },
    setItem(key, value) { writes++; if (quota && key === 'ep_sprints') throw new Error('Cuota agotada'); data.set(key, value); },
  });
  return {
    repository,
    provider: { async getHolidaysForRange(start, end) {
      const list = [];
      for (let year = start; year <= end; year++) list.push(...calculateColombianHolidays(year));
      const result = { holidayList: list, holidaySet: new Set(list.map(h => h.date)), source: 'local' };
      if (name === 'calendario') return new Promise(resolve => pending.push(() => resolve(result)));
      return result;
    } },
    releaseStorage() { quota = false; blocked = false; },
    releaseCalendar() { pending.splice(0).forEach(resolve => resolve()); },
    inspect: () => JSON.stringify({ writes, entries: Object.fromEntries(data) }, null, 2),
  };
}
function Checks() {
  const [scenario, setScenario] = useState('normal');
  const [inspection, setInspection] = useState('');
  const fixture = useMemo(() => scenarioFor(scenario), [scenario]);
  return <>
    <aside style={{ padding: '1rem', border: '2px solid #00607f' }}>
      <strong>Verificación local — datos de prueba en memoria</strong>
      <label style={{ display: 'block' }}>Escenario de prueba <select value={scenario} onChange={e => { setScenario(e.target.value); setInspection(''); }}>
        {['normal', 'cuota', 'corrupto', 'bloqueado', 'calendario'].map(value => <option key={value}>{value}</option>)}
      </select></label>
      <button className="btn" onClick={() => fixture.releaseStorage()}>Restablecer almacenamiento de prueba</button>
      <button className="btn" onClick={() => fixture.releaseCalendar()}>Resolver calendario de prueba</button>
      <button className="btn" onClick={() => setInspection(fixture.inspect())}>Inspeccionar almacenamiento de prueba</button>
      <pre id="storage-inspection" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{inspection}</pre>
    </aside>
    <ProjectProvider key={scenario} repository={fixture.repository} holidayProvider={fixture.provider}>
      <Header />
      <main id="main-content" tabIndex={-1} style={{ padding: '1.5rem', maxWidth: 1280, margin: 'auto' }}>
        <PersistenceNotice /><EstimatorPage />
      </main>
    </ProjectProvider>
  </>;
}
createRoot(document.getElementById('root')).render(<React.StrictMode><BrowserRouter><Checks /></BrowserRouter></React.StrictMode>);
