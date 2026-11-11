import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createLocalStorageProjectRepository } from './localStorageProjectRepository';
const memory = () => { const data = new Map(); return { data, getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k, String(v)) }; };
describe('repositorio con resultados explícitos', () => {
  it('guarda ambas claves históricas y distingue ausencia', () => {
    const storage = memory(), repo = createLocalStorageProjectRepository(storage);
    assert.equal(repo.loadSprints().status, 'empty');
    assert.deepEqual(repo.saveProjectInfo({name:'P'}), {ok:true});
    assert.deepEqual(repo.saveSprints([]), {ok:true});
    assert.deepEqual(repo.loadProjectInfo().data, {name:'P'});
    assert.deepEqual(repo.loadSprints().data, []);
    assert.deepEqual([...storage.data.keys()], ['ep_projectInfo','ep_sprints']);
  });
  it('preserva JSON corrupto y archiva originales sin sobrescribirlos', () => {
    const storage = memory(), repo = createLocalStorageProjectRepository(storage);
    storage.setItem('ep_sprints','{roto');
    assert.equal(repo.loadSprints().status, 'error');
    assert.equal(repo.loadSprints().raw, '{roto');
    assert.equal(repo.archiveRecovery({ep_sprints:'{roto'}).ok,true);
    assert.equal(storage.getItem('ep_sprints'),'{roto');
    assert.ok([...storage.data.keys()].some(k=>k.startsWith('ep_recovery_')));
  });
  it('comunica almacenamiento ausente, bloqueo y cuota agotada', () => {
    for (const storage of [null, {getItem(){throw new Error('SecurityError')},setItem(){throw new Error('QuotaExceededError')}}]) {
      const repo = createLocalStorageProjectRepository(storage);
      assert.equal(repo.loadSprints().status,'error');
      assert.equal(repo.saveSprints([]).ok,false);
    }
  });
});
