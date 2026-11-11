/**
 * @typedef {{status: 'ok', data: *, raw: string}|{status: 'empty', raw: null}|{status: 'error', kind: string, message: string, raw: string|null}} ReadResult
 * @typedef {{ok: true}|{ok: false, message: string}} WriteResult
 * @typedef {Object} ProjectRepository
 * @property {() => ReadResult} loadProjectInfo
 * @property {() => ReadResult} loadSprints
 * @property {(info: Object) => WriteResult} saveProjectInfo
 * @property {(sprints: Array) => WriteResult} saveSprints
 * @property {(raw: Object) => WriteResult} archiveRecovery Guarda originales antes de reemplazar datos corruptos.
 *
 * @typedef {Object} HolidayCalendar
 * @property {Set<string>} holidaySet
 * @property {Array<{date: string, name: string, type: string}>} holidayList
 * @property {'api'|'cache'|'local'} source
 *
 * @typedef {Object} HolidayProvider
 * @property {(startYear: number, endYear: number) => Promise<HolidayCalendar>} getHolidaysForRange
 *
 * Métodos de GitLab que usa la aplicación. La implementación
 * (`infrastructure/gitlabApi.js`) expone más, pero solo estos forman el contrato.
 * @typedef {Object} GitlabApi
 * @property {(options?: Object) => Promise<Object>} user
 * @property {(id: string|number, options?: Object) => Promise<Object>} project
 * @property {(id: string|number, fullPath: string, options?: Object) => Promise<Array>} issuesWithDates
 * @property {(id: string|number, options?: Object) => Promise<Array>} issues
 * @property {(id: string|number, iid: string|number, options?: Object) => Promise<Object>} issue
 * @property {(id: string|number, body: Object, options?: Object) => Promise<Object>} createIssue
 * @property {(id: string|number, iid: string|number, body: Object, options?: Object) => Promise<Object>} updateIssue
 * @property {(id: string|number, iid: string|number, options?: Object) => Promise<Array>} issueNotes
 * @property {(id: string|number, options?: Object) => Promise<Array>} milestones
 * @property {(id: string|number, mid: string|number, options?: Object) => Promise<Object>} milestone
 * @property {(id: string|number, body: Object, options?: Object) => Promise<Object>} createMilestone
 * @property {(id: string|number, mid: string|number, body: Object, options?: Object) => Promise<Object>} updateMilestone
 * @property {(id: string|number, options?: Object) => Promise<Array>} members
 *
 * Registro local de vínculos con el rastreador remoto. Se degrada sin almacenamiento.
 * @typedef {Object} RemoteBindingJournal
 * @property {boolean} available
 * @property {(entry: Object, remote: Object) => void} record
 * @property {(sprints: Array, target: string) => Array} restore
 * @property {() => void} clear
 */
export {};
