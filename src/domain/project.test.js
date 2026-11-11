import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyProjectRules, createDefaultProjectInfo } from './project';

describe('createDefaultProjectInfo', () => {
  it('crea un proyecto nuevo con cliente vacío y la fecha indicada', () => {
    assert.deepEqual(createDefaultProjectInfo(new Date(2026, 2, 16)), {
      name: 'Nuevo Proyecto',
      client: '',
      startDate: '2026-03-16',
      manager: '',
      status: 'planeacion',
      integration: { provider: null, url: '', repo: '', clientId: '' },
    });
  });
});

describe('applyProjectRules', () => {
  it('conserva todos los campos incluyendo el cliente', () => {
    const info = applyProjectRules({ name: 'X', client: 'Mi Empresa', startDate: '2026-01-01' });
    assert.deepEqual(info, { name: 'X', client: 'Mi Empresa', startDate: '2026-01-01' });
  });
});
