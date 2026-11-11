import React from 'react';
import { Trash2, GripVertical, Copy, ChevronDown, ChevronRight, ArrowUp, ArrowDown, Flag } from 'lucide-react';
import { useProjectActions, useProjectState } from '../../context/ProjectContext';
import { calculateProgress, getSprintCompletion } from '../../domain/metrics';

export default function SprintHeader({ sprint, index, isCollapsed, onToggleCollapse, onRequestDelete, onSprintDragStart, onSprintDragEnd }) {
  const { renameSprint, cloneSprint, moveSprint, setProductDeliverySprint } = useProjectActions();
  const { sprints } = useProjectState();
  const progress = calculateProgress(sprint.tasks);
  const { completed, isComplete } = getSprintCompletion(sprint.tasks);
  return <div className="sprint-header">
    <div className="sprint-heading">
      <span className="sprint-drag-handle" draggable aria-hidden="true" title="Arrastra para reordenar sprint"
        onDragStart={e=>onSprintDragStart?.(e,index)} onDragEnd={onSprintDragEnd}><GripVertical size={16}/></span>
      <button className="icon-button" aria-label={`${isCollapsed ? 'Expandir' : 'Contraer'} ${sprint.name}`}
        aria-expanded={!isCollapsed} aria-controls={`sprint-content-${encodeURIComponent(sprint.id)}`} onClick={onToggleCollapse}>
        {isCollapsed ? <ChevronRight size={18}/> : <ChevronDown size={18}/>}
      </button>
      <input aria-label="Nombre del sprint" className="input-ghost sprint-name" value={sprint.name}
        onChange={e=>renameSprint(sprint.id,e.target.value)} maxLength={80} placeholder="Nombre del Sprint / Fase"/>
    </div>
    <div className="sprint-summary">
      {sprint.productDelivery && <span className="badge product-delivery-badge"><Flag size={12} /> Entrega del producto</span>}
      <span className="badge">{completed} de {sprint.tasks.length} tareas completadas</span>
      <span className={`badge ${isComplete ? 'status-complete' : ''}`}>{isComplete ? '✓ Sprint completado' : `${progress}% de avance`}</span>
    </div>
    <div className="sprint-actions">
      <button className={`icon-button sprint-delivery-button ${sprint.productDelivery ? 'is-product-delivery' : ''}`} aria-pressed={Boolean(sprint.productDelivery)}
        aria-label={`${sprint.productDelivery ? 'Quitar' : 'Marcar'} ${sprint.name} como entrega del producto`}
        title={sprint.productDelivery ? 'Quitar hito de entrega' : 'Marcar como entrega del producto'} onClick={()=>setProductDeliverySprint(sprint.id)}><Flag size={15}/><span>Entrega</span></button>
      <button className="icon-button" aria-label={`Subir ${sprint.name}`} title="Subir sprint" disabled={index===0} onClick={()=>moveSprint(index,index-1)}><ArrowUp size={16}/></button>
      <button className="icon-button" aria-label={`Bajar ${sprint.name}`} title="Bajar sprint" disabled={index===sprints.length-1} onClick={()=>moveSprint(index,index+1)}><ArrowDown size={16}/></button>
      <button className="icon-button" aria-label={`Clonar ${sprint.name}`} title="Clonar sprint" onClick={()=>cloneSprint(sprint.id)}><Copy size={16}/></button>
      <button className="icon-button btn-danger" aria-label={`Eliminar ${sprint.name}`} title="Eliminar sprint" onClick={onRequestDelete}><Trash2 size={16}/></button>
    </div>
  </div>;
}
