import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:18082';
const existingId = process.argv[3];

async function request(path, expectedStatus, options) {
  const response = await fetch(new URL(path, baseUrl), {
    ...options,
    signal: AbortSignal.timeout(10000),
  });
  assert.equal(response.status, expectedStatus, `${options?.method ?? 'GET'} ${path}: HTTP ${response.status}`);
  return response.json();
}

const home = await fetch(new URL('/', baseUrl), { signal: AbortSignal.timeout(10000) });
assert.equal(home.status, 200);
assert.match(await home.text(), /Estimador Pro/);
console.log('GET / -> 200 | Estimador Pro');

const health = await request('/api/health', 200);
assert.deepEqual(health, { status: 'ok', storageHost: 'storage' });
console.log(`GET /api/health -> 200 | storageHost=${health.storageHost}`);

if (existingId) {
  const saved = await request(`/api/backups/${existingId}`, 200);
  assert.equal(saved.id, existingId);
  assert.match(saved.snapshot.projectInfo.name, /^Proyecto ficticio - /);
  assert.equal(saved.snapshot.sprints[0].tasks[0].title, 'Validar persistencia');
  console.log(`GET /api/backups/${saved.id} -> 200 | ${saved.snapshot.projectInfo.name}`);
  console.log('OK: el respaldo sigue disponible después de recrear los contenedores.');
} else {
  const snapshot = {
    projectInfo: { name: `Proyecto ficticio - ${randomUUID().slice(0, 8)}` },
    sprints: [{ id: 'demo-sprint', name: 'Sprint 1', tasks: [
      { id: 'demo-task', title: 'Validar persistencia', duration: 2 },
    ] }],
  };
  const created = await request('/api/backups', 201, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(snapshot),
  });
  assert.match(created.id, /^[0-9a-f-]{36}$/i);
  console.log(`POST /api/backups -> 201 | id=${created.id}`);
  const saved = await request(`/api/backups/${created.id}`, 200);
  assert.equal(saved.id, created.id);
  assert.deepEqual(saved.snapshot, snapshot);
  console.log(`GET /api/backups/${saved.id} -> 200`);
  console.log(`Proyecto: ${saved.snapshot.projectInfo.name} | sprints: ${saved.snapshot.sprints.length}`);
  console.log('OK: el respaldo recuperado coincide con el JSON enviado.');
}
