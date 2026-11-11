import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readProject, saveProject, retryProjectRecovery, archiveBeforeRecoveryImport, persistProjectUnlessBlocked } from './projectPersistence';
import { createLocalStorageProjectRepository } from '../infrastructure/localStorageProjectRepository';
import { normalizeProject } from './projectValidation';
import { projectReducer } from './projectReducer';
it('carga respaldos antiguos y no escribe al detectar corrupción', () => {
  const data = new Map([['ep_sprints','[{"id":"s","name":"S","tasks":[{"id":"t"}]}]']]);
  let writes = 0;
  const repo = createLocalStorageProjectRepository({getItem:k=>data.get(k)??null,setItem(){writes++}});
  assert.equal(readProject(repo).project.sprints[0].tasks[0].progress,0);
  data.set('ep_sprints','{roto');
  const loaded = readProject(repo);
  assert.equal(loaded.recovery.raw.ep_sprints,'{roto');
  assert.equal(writes,0);
});
it('detecta un fallo parcial y guarda correctamente al reintentar', () => {
  let fail = true;
  const stored = new Map();
  const repo = createLocalStorageProjectRepository({getItem:k=>stored.get(k)??null,setItem(k,v){if(k==='ep_sprints'&&fail)throw new Error('cuota');stored.set(k,v)}});
  const project = normalizeProject({sprints:[]});
  assert.equal(saveProject(repo,project).ok,false);
  fail=false;
  assert.equal(saveProject(repo,project).ok,true);
  assert.deepEqual(JSON.parse(stored.get('ep_sprints')),[]);
});
it('reemplaza información y sprints mediante una sola transición', () => {
  const before = normalizeProject({projectInfo:{name:'Anterior'},sprints:[]});
  const after = normalizeProject({projectInfo:{name:'Importado'},sprints:[{id:'s',name:'S',tasks:[]}]});
  const next=projectReducer(before,{type:'REPLACE_PROJECT',payload:after});
  assert.equal(next.projectInfo.name,'Importado');
  assert.equal(next.sprints.length,1);
  assert.equal(before.projectInfo.name,'Anterior');
  assert.throws(()=>normalizeProject({sprints:[{id:'s',tasks:[{id:'t',title:{}}]}]}),/título/);
});

it('suspende todas las escrituras y conserva originales ante corrupción', () => {
  let writes=0;
  const data=new Map([['ep_sprints','{original corrupto']]);
  const repo=createLocalStorageProjectRepository({getItem:k=>data.get(k)??null,setItem(k,v){writes++;data.set(k,v)}});
  const initial=readProject(repo);
  assert.equal(persistProjectUnlessBlocked(repo,initial.project,true).blocked,true);
  assert.equal(writes,0);
  const retried=retryProjectRecovery(repo,initial.project,initial.project,initial.recovery);
  assert.equal(retried.recovery.raw.ep_sprints,'{original corrupto');
  archiveBeforeRecoveryImport(repo,retried.recovery,false);
  assert.equal(data.get('ep_sprints'),'{original corrupto');
  assert.equal([...data.keys()].filter(k=>k.startsWith('ep_recovery_')).length,1);
});

it('requiere conservar originales antes de importar si no puede archivarlos', () => {
  const repo={loadProjectInfo:()=>({status:'empty',raw:null}),loadSprints:()=>({status:'error',kind:'invalid-json',raw:'{original'}),archiveRecovery:()=>({ok:false,message:'cuota'})};
  const recovery={raw:{ep_projectInfo:null,ep_sprints:'{original'}};
  assert.throws(()=>archiveBeforeRecoveryImport(repo,recovery,false),/Descarga primero/);
  assert.doesNotThrow(()=>archiveBeforeRecoveryImport(repo,recovery,true));
});

it('no importa sobre originales que aún no se pueden leer', () => {
  const repo=createLocalStorageProjectRepository({getItem(){throw new Error('bloqueado')},setItem(){throw new Error('no debe escribir')}});
  assert.throws(()=>archiveBeforeRecoveryImport(repo,{raw:{}},true),/Restablece el acceso/);
});

it('una descarga anterior no permite perder datos cambiados entre lecturas', () => {
  const repo={loadProjectInfo:()=>({status:'empty',raw:null}),loadSprints:()=>({status:'ok',raw:'[]'}),archiveRecovery:()=>({ok:false})};
  assert.throws(()=>archiveBeforeRecoveryImport(repo,{raw:{ep_projectInfo:null,ep_sprints:'{original'}},true),/Reintentar/);
});

it('recupera una lectura bloqueada sin sobrescribir ediciones pendientes', () => {
  let blocked=true;
  const data=new Map([['ep_sprints','[{"id":"s","name":"Guardado","tasks":[]}]']]);
  const repo=createLocalStorageProjectRepository({getItem(k){if(blocked)throw new Error('bloqueado');return data.get(k)??null},setItem(){throw new Error('no debe escribir')}});
  const initial=readProject(repo);
  blocked=false;
  const clean=retryProjectRecovery(repo,initial.project,initial.project,initial.recovery);
  assert.equal(clean.recoveredProject.sprints[0].name,'Guardado');
  const dirty={...initial.project,projectInfo:{...initial.project.projectInfo,name:'Edición pendiente'}};
  const retry=retryProjectRecovery(repo,dirty,initial.project,initial.recovery);
  assert.equal(retry.recoveredProject,undefined);
  assert.equal(retry.recovery.raw.ep_sprints,data.get('ep_sprints'));
  assert.equal(dirty.projectInfo.name,'Edición pendiente');
});
