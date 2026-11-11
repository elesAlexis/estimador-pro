import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getNextSprintName } from './sprints';
import { BASE_TEMPLATE } from './templates';

describe('getNextSprintName', () => {
  it('empieza en Sprint 1', () => {
    assert.equal(getNextSprintName([]), 'Sprint 1');
    assert.equal(getNextSprintName([{ name: 'Preparación y Planeación' }]), 'Sprint 1');
  });

  it('continúa después del mayor número existente', () => {
    assert.equal(getNextSprintName([{ name: 'Sprint 1' }]), 'Sprint 2');
    assert.equal(getNextSprintName([{ name: 'Sprint 3' }, { name: 'Sprint 1' }]), 'Sprint 4');
  });

  it('reconoce nombres con descripción y la plantilla base', () => {
    assert.equal(getNextSprintName([{ name: 'Sprint 1 - Base Core (Copia)' }]), 'Sprint 2');
    assert.equal(getNextSprintName(BASE_TEMPLATE), 'Sprint 2');
  });

  it('ignora nombres que solo contienen la palabra', () => {
    assert.equal(getNextSprintName([{ name: 'Sprint final' }, { name: 'Cierre Sprint 9' }]), 'Sprint 1');
  });
});
