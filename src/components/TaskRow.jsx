import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { Trash2, GripVertical, MessageSquare, ArrowUp, ArrowDown, MoreHorizontal, ExternalLink } from 'lucide-react';
import { isValidDuration } from '../domain/schedule';
import { PRIORITY_CONFIG, TASK_TYPES } from '../utils/templateData';
import { useProjectActions, useProjectState } from '../context/ProjectContext';
import ConfirmModal from './ConfirmModal';
import Tooltip from './Tooltip';
import TaskDetailsPanel from './TaskDetailsPanel';
import TaskScheduleCell from './TaskScheduleCell';
import { TASK_GRID_COLUMNS } from './taskGrid';
import { getTaskProgress, isTaskComplete } from '../domain/metrics';
import TaskTrackingPanel from './TaskTrackingPanel';

function GrowingText({ value, onChange, ...props }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const element = ref.current;
    const resize = () => { element.style.height = 'auto'; element.style.height = `${element.scrollHeight + 2}px`; };
    resize();
    let width = element.clientWidth;
    const observer = new ResizeObserver(() => {
      if (element.clientWidth !== width) { width = element.clientWidth; resize(); }
    });
    observer.observe(element);
    let active = true;
    document.fonts.ready.then(() => { if (active) resize(); });
    return () => { active = false; observer.disconnect(); };
  }, [value]);
  return <textarea {...props} ref={ref} rows={1} value={value ?? ''} onChange={onChange} />;
}

export default function TaskRow({ task, sprintId, index, onDragStart, onDragEnd, onDragOver, onDrop, dragOverInfo }) {
  const { updateTask, removeTask, moveTask, setRealDates } = useProjectActions();
  const { sprints } = useProjectState();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [showDesc, setShowDesc] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const id = useId();
  const sprint = sprints.find(s => s.id === sprintId);
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.media;
  const durationIsValid = task.scheduleMode === 'imported' || isValidDuration(task.duration);
  const update = (field, value) => updateTask(sprintId, task.id, field, value);
  const progress = getTaskProgress(task);
  const complete = isTaskComplete(task);
  const changeProgress = value => {
    const opener = document.activeElement;
    update('progress', value);
    requestAnimationFrame(() => {
      if (!opener?.isConnected) document.getElementById(`sprint-${encodeURIComponent(sprintId)}`)?.focus();
    });
  };
  const move = targetIndex => moveTask({ taskId: task.id, sourceSprintId: sprintId, targetSprintId: sprintId, targetIndex });
  const dropClass = dragOverInfo?.taskId === task.id ? ` task-row-drag-over-${dragOverInfo.position}` : '';
  return <article className={`task-item ${complete ? 'task-complete' : ''}`} data-focus-container tabIndex={-1} aria-label={`Tarea: ${task.title || 'Sin título'}`}>
    <div className={`task-row${dropClass}`} style={{ '--task-columns': TASK_GRID_COLUMNS }}
      onDragOver={e => onDragOver(e, task, index)} onDrop={e => onDrop(e, index)}>
      <span className="drag-handle task-drag" draggable onDragStart={e => onDragStart(e, task, sprintId, index)} onDragEnd={onDragEnd}
        title="Arrastra para mover" aria-hidden="true"><GripVertical size={14} /></span>
      <label className="task-wbs"><span className="field-caption">WBS</span>
        <input aria-label={`WBS de ${task.title}`} className="input-ghost" value={task.wbs || ''} placeholder={task.calculatedWbs}
          maxLength={15} onChange={e => update('wbs', e.target.value)} />
      </label>
      <div className="task-title">
        <label><span className="field-caption">Tipo</span>
          <select aria-label={`Tipo de ${task.title}`} value={task.type} onChange={e => update('type', e.target.value)}
            className={`task-type-select ${TASK_TYPES[task.type]?.bgClass || ''}`}>
            {Object.entries(TASK_TYPES).map(([value, {label}]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <div className="task-name"><label><span className="field-caption">Tarea / hito</span>
          <GrowingText aria-label="Nombre de la tarea" className="input-ghost" value={task.title} maxLength={120}
            placeholder="Descripción de la tarea" onChange={e => update('title', e.target.value)} />
        </label>
          <div className="task-tracking-inline">
            <span className={`task-status ${complete ? 'status-complete' : progress > 0 ? 'status-active' : ''}`}>
              {complete ? '✓ Completada' : progress > 0 ? 'En curso' : 'Pendiente'}</span>
            <label className="inline-progress"><span className="sr-only">Avance de {task.title}</span>
              <input type="number" min="0" max="100" step="1" value={progress}
                onChange={e => changeProgress(Math.max(0, Math.min(100, Math.round(Number(e.target.value) || 0))))} />%</label>
            {!complete && <button type="button" className="tracking-link" onClick={() => changeProgress(100)}
              aria-label={`Marcar ${task.title} como completada`}>Completar</button>}
            <button type="button" className="tracking-link" aria-expanded={showTracking} aria-controls={`${id}-tracking`}
              onClick={() => setShowTracking(v => !v)}>Seguimiento</button>
            {task.externalUrl && (
              <a href={task.externalUrl} target="_blank" rel="noopener noreferrer" className="tracking-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-info)' }} aria-label="Abrir issue en GitHub/GitLab">
                Ver Issue <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>
        <Tooltip content="Ver/editar observaciones">
          <button type="button" className="icon-button" aria-label={`Observaciones de ${task.title}`} aria-haspopup="dialog"
            onClick={() => setShowDesc(true)}><MessageSquare size={16}/></button>
        </Tooltip>
      </div>
      <label className="task-role"><span className="field-caption">Responsable</span>
        <GrowingText aria-label={`Responsable de ${task.title}`} className="input-ghost" value={task.role} maxLength={50}
          placeholder="Rol" onChange={e => update('role', e.target.value)} />
      </label>
      <label className="task-duration"><span className="field-caption">Días hábiles</span>
        <input aria-label={`Duración de ${task.title}`} className="input" type="number" min="0" max="36500" step="1"
          value={task.duration} onChange={e => update('duration', e.target.value === '' ? 0 : Number(e.target.value))}
          aria-invalid={!durationIsValid} aria-describedby={!durationIsValid ? `${id}-duration-error` : undefined} />
        {!durationIsValid && <span id={`${id}-duration-error`} className="field-error">Pendiente: mínimo 1 día.</span>}
        {task.scheduleMode === 'imported' && !isValidDuration(task.duration) && <span className="text-xs">Sin estimación</span>}
      </label>
      <label className="task-priority"><span className="field-caption">Prioridad</span>
        <select aria-label={`Prioridad de ${task.title}`} value={task.priority || 'media'} onChange={e => update('priority', e.target.value)}
          style={{color:task.priority === 'alta' ? '#b91c1c' : task.priority === 'baja' ? '#4b5563' : '#92400e', background:priority.bg, borderColor:priority.border}}>
          {Object.entries(PRIORITY_CONFIG).map(([value,{label,icon}])=><option key={value} value={value}>{icon} {label}</option>)}
        </select>
      </label>
      <div className="task-dates"><span className="field-caption">Calendario estimado</span><TaskScheduleCell task={task}/></div>
      <details className="task-actions" onKeyDown={e => {
        if (e.key === 'Escape') { e.currentTarget.open = false; e.currentTarget.querySelector('summary').focus(); }
      }}>
        <summary aria-label={`Acciones de ${task.title}`}><MoreHorizontal size={18}/><span className="mobile-only">Acciones</span></summary>
        <div className="task-actions-menu">
          <button className="btn btn-ghost btn-sm" disabled={index === 0} onClick={()=>move(index-1)}><ArrowUp size={14}/>Subir tarea</button>
          <button className="btn btn-ghost btn-sm" disabled={index === sprint.tasks.length-1} onClick={()=>move(index+1)}><ArrowDown size={14}/>Bajar tarea</button>
          <label>Mover a otro sprint
            <select className="input" value="" onChange={e => {
              const targetId = e.target.value;
              if (targetId) {
                moveTask({taskId:task.id,sourceSprintId:sprintId,targetSprintId:targetId,targetIndex:sprints.find(s=>s.id===targetId).tasks.length});
                requestAnimationFrame(() => document.getElementById(`sprint-${encodeURIComponent(targetId)}`)?.focus());
              }
            }}>
              <option value="">Seleccionar sprint</option>
              {sprints.filter(s=>s.id!==sprintId).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <button className="btn btn-ghost btn-sm" onClick={()=>setIsConfirmOpen(true)}><Trash2 size={14}/>Eliminar tarea</button>
        </div>
      </details>
    </div>
    {showTracking && <div id={`${id}-tracking`}><TaskTrackingPanel task={task} onUpdate={update}
      onConfirmDates={() => setRealDates(sprintId, task.id, task.calculatedStart, task.calculatedEnd)} /></div>}
    <TaskDetailsPanel task={task} onUpdate={update} isOpen={showDesc} onClose={() => setShowDesc(false)}/>
    <ConfirmModal isOpen={isConfirmOpen} onClose={()=>setIsConfirmOpen(false)} onConfirm={()=>removeTask(sprintId,task.id)}
      title="¿Eliminar tarea?" message="Esta acción no se puede deshacer."/>
  </article>;
}
