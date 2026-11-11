import { formatDate } from '../shared/calendarDate';
import { markdownBlocks, safeMarkdownLink } from './markdown';
import { buildReportTimeline, reportBarPlacement } from '../domain/progressReport';

export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
}[character]));

const inlineMarkdown = (value, baseUrl) => {
  const source = escapeHtml(value);
  return source
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^\s)]+)\)/g, (match, label, url) => {
      const safe = safeMarkdownLink(url.replaceAll('&amp;', '&'), baseUrl);
      return safe ? `<a href="${escapeHtml(safe)}" target="_blank" rel="noreferrer">${label}</a>` : label;
    });
};

export function markdownToSafeHtml(source = '', baseUrl) {
  return markdownBlocks(source).map(block => {
    if (block.type === 'heading') return `<h${block.level}>${inlineMarkdown(block.text, baseUrl)}</h${block.level}>`;
    if (block.type === 'code') return `<pre><code>${escapeHtml(block.text)}</code></pre>`;
    if (block.type === 'quote') return `<blockquote>${inlineMarkdown(block.text, baseUrl)}</blockquote>`;
    if (block.type === 'list') {
      const tag = block.ordered ? 'ol' : 'ul';
      const items = block.items.map(item => `<li>${item.checked === null ? '' : `<span class="check ${item.checked ? 'checked' : ''}">${item.checked ? '✓' : ''}</span>`}${inlineMarkdown(item.text, baseUrl)}</li>`).join('');
      return `<${tag}>${items}</${tag}>`;
    }
    return `<p>${inlineMarkdown(block.text, baseUrl).replaceAll('\n', '<br>')}</p>`;
  }).join('');
}

const status = item => `<span class="status ${escapeHtml(item.status.key)}">${escapeHtml(item.status.label)}</span>`;
const progressBar = value => `<div class="progress" aria-label="${value}%"><i style="width:${value}%"></i></div>`;
const dateWindow = (start, end) => start || end ? `${formatDate(start) || 'Sin inicio'} — ${formatDate(end) || 'Sin entrega'}` : 'Sin fechas';

const sprintGantt = (report, timeline) => report.sprints.map(sprint => {
  const place = reportBarPlacement(report, sprint.start, sprint.end);
  return `<div class="gantt-row"><div class="gantt-label"><strong>${escapeHtml(sprint.name)}</strong><small>${sprint.productDelivery ? '⚑ Entrega del producto · ' : ''}${sprint.completedTasks} de ${sprint.tasks.length} tareas</small></div><div class="gantt-track" style="--week:${timeline.weekWidth}%">${timeline.today !== null ? `<i class="today-line" style="left:${timeline.today}%"></i>` : ''}${place ? `<span class="gantt-bar ${escapeHtml(sprint.status.key)}" style="left:${place.left}%;width:${place.width}%"><i style="width:${sprint.progress}%"></i><b>${sprint.progress}%</b></span>` : '<span class="gantt-none">Sin fechas</span>'}</div></div>`;
}).join('');

const taskDetail = (task, comments, baseUrl) => {
  // Las notas internas de GitLab nunca forman parte de un archivo pensado para compartir.
  const commentList = (comments?.[task.id] || []).filter(comment => !comment.internal);
  const description = task.description ? `<section><h4>Descripción</h4><div class="markdown">${markdownToSafeHtml(task.description, baseUrl)}</div></section>` : '';
  const observations = task.observations ? `<section><h4>Observaciones locales</h4><div class="markdown">${markdownToSafeHtml(task.observations, baseUrl)}</div></section>` : '';
  const notes = commentList.length ? `<section><h4>Comentarios de GitLab</h4>${commentList.map(note => `<article class="comment"><header><strong>${escapeHtml(note.author)}</strong><time>${escapeHtml(note.createdAt ? new Date(note.createdAt).toLocaleString('es-CO') : '')}</time></header><div class="markdown">${markdownToSafeHtml(note.body, baseUrl)}</div></article>`).join('')}</section>` : '';
  return `<details class="task"><summary><span><b>${escapeHtml(task.wbs || task.calculatedWbs || '')}</b>${escapeHtml(task.title || 'Tarea sin nombre')}</span><span class="task-meta">${status(task)}<em>${task.progress}%</em></span></summary><div class="task-body"><div class="task-facts"><span><b>Responsable</b>${escapeHtml(task.role || 'Sin asignar')}</span><span><b>Módulo</b>${escapeHtml(task.module)}</span><span><b>Fechas</b>${escapeHtml(dateWindow(task.start, task.end))}</span><span><b>Duración</b>${escapeHtml(task.duration || 0)} días hábiles</span></div>${description || observations || notes ? description + observations + notes : '<p class="empty">Sin descripción ni observaciones registradas.</p>'}</div></details>`;
};

export function createProgressHtml(report, comments = {}) {
  const projectName = report.project.name || 'Proyecto sin nombre';
  const manager = report.project.manager || 'Sin registrar';
  const generated = new Date().toLocaleString('es-CO');
  const baseUrl = report.project.integration?.url || undefined;
  const hasProductDelivery = Boolean(report.totals.productDeliverySprintId);
  const timeline = buildReportTimeline(report);
  const monthHeader = `<div class="gantt-months"><span></span><div>${timeline.months.map(month => `<b style="left:${month.left}%;width:${month.width}%">${escapeHtml(month.label)}</b>`).join('')}${timeline.today !== null ? `<i class="today-label" style="left:${timeline.today}%">HOY</i>` : ''}</div></div>`;
  const sprintRows = report.sprints.map(sprint => `<tr><td><strong>${escapeHtml(sprint.name)}</strong>${sprint.productDelivery ? '<small class="delivery-marker">⚑ Entrega del producto</small>' : ''}</td><td>${escapeHtml(dateWindow(sprint.start, sprint.end))}</td><td>${status(sprint)}</td><td>${sprint.completedTasks} / ${sprint.tasks.length}</td><td><div class="table-progress">${progressBar(sprint.progress)}<b>${sprint.progress}%</b></div></td></tr>`).join('');
  const modules = report.modules.map(module => `<div class="module"><div><strong>${escapeHtml(module.name)}</strong><span>${module.completed} de ${module.tasks} completadas</span></div><b>${module.progress}%</b>${progressBar(module.progress)}</div>`).join('');
  const details = report.sprints.map(sprint => `<details class="sprint"><summary><span><small>SPRINT ${sprint.number}${sprint.productDelivery ? ' · ENTREGA DEL PRODUCTO' : ''}</small><strong>${escapeHtml(sprint.name)}</strong></span><span>${status(sprint)}<b>${sprint.progress}%</b></span></summary><div class="sprint-body">${sprint.tasks.length ? sprint.tasks.map(task => taskDetail(task, comments, baseUrl)).join('') : '<p class="empty">Este sprint no tiene tareas.</p>'}</div></details>`).join('');
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Avance · ${escapeHtml(projectName)}</title>
<style>
:root{--ink:#263746;--muted:#687988;--line:#dfe6eb;--paper:#f4f7f9;--white:#fff;--blue:#718e9f;--sage:#81968a;--sand:#aa977e;--danger:#a66a61}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.55}.shell{max-width:1180px;margin:auto;padding:40px 28px 70px}.hero{background:#fff;border:1px solid var(--line);border-radius:22px;padding:34px;box-shadow:0 12px 40px #2637460b}.brand{font-size:11px;font-weight:800;letter-spacing:.14em;color:var(--blue)}h1{font-size:clamp(28px,5vw,50px);line-height:1.06;margin:16px 0 12px;letter-spacing:-.035em}.lead{color:var(--muted);margin:0}.meta{display:flex;gap:24px;flex-wrap:wrap;margin-top:28px;padding-top:20px;border-top:1px solid var(--line);font-size:13px}.meta b{display:block;color:var(--ink)}.meta span{color:var(--muted)}.scope-note{display:flex;gap:10px;margin:16px 0 0;padding:12px 15px;border:1px solid #dce5c9;border-radius:10px;background:#f6f8f0;color:#66715b;font-size:12px}.scope-note strong{color:#526047}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:18px 0}.kpi,.panel{background:#fff;border:1px solid var(--line);border-radius:16px}.kpi{padding:18px}.kpi span{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}.kpi strong{font-size:28px}.kpi small{color:var(--muted)}.panel{padding:26px;margin-top:18px}.panel-title{display:flex;justify-content:space-between;align-items:end;gap:20px;margin-bottom:20px}.panel-title h2{font-size:20px;margin:0}.panel-title p{font-size:12px;color:var(--muted);margin:0}.gantt{overflow-x:auto}.gantt-inner{min-width:700px}.gantt-months{display:grid;grid-template-columns:200px 1fr;gap:20px;height:48px}.gantt-months>div{position:relative;border-bottom:1px solid var(--line)}.gantt-months>div>b{position:absolute;top:0;height:29px;padding:4px 10px;border-left:1px solid var(--line);font-size:10px;letter-spacing:.08em;color:#71819a;white-space:nowrap}.gantt-months>div>b:last-of-type{border-right:1px solid var(--line)}.today-label{position:absolute;z-index:4;top:30px;transform:translateX(-50%);padding:2px 7px;border-radius:5px;background:#c4d600;color:#27374a;font-size:9px;font-style:normal;font-weight:850;letter-spacing:.08em}.gantt-row{display:grid;grid-template-columns:200px 1fr;gap:20px;align-items:center;padding:11px 0;border-bottom:1px solid #edf1f4}.gantt-label strong,.gantt-label small{display:block}.gantt-label small{font-size:11px;color:var(--muted)}.gantt-track{height:28px;border-radius:6px;position:relative;background-color:#f3f6f8;background-image:linear-gradient(90deg,transparent calc(100% - 1px),#dfe6eb calc(100% - 1px));background-size:var(--week,10%) 100%}.today-line{position:absolute;z-index:3;top:-12px;bottom:-12px;width:2px;transform:translateX(-1px);background:#b8cc00}.gantt-bar{position:absolute;z-index:2;min-width:16px;height:20px;top:4px;border-radius:5px;background:#dfe6ea;overflow:hidden}.gantt-bar i{display:block;height:100%;background:var(--blue);opacity:.55}.gantt-bar b{position:absolute;inset:0;display:grid;place-items:center;font-size:10px}.gantt-bar.complete i{background:var(--sage);opacity:.9}.gantt-bar.overdue{outline:1px solid var(--danger)}.gantt-none{font-size:11px;color:var(--muted);padding-left:8px}.status{display:inline-flex;border-radius:999px;padding:4px 9px;background:#edf1f4;color:#5c6d7a;font-size:11px;font-weight:700;white-space:nowrap}.status.complete{background:#edf4f0;color:#496456}.status.active{background:#eef4f7;color:#49697b}.status.overdue{background:#f8eeee;color:#89564f}.status.pending,.status.unscheduled{background:#f5f2ee;color:#746858}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;min-width:720px;font-size:13px}th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);padding:10px;border-bottom:1px solid var(--line)}td{padding:13px 10px;border-bottom:1px solid #edf1f4}.delivery-marker{display:block;margin-top:3px;color:#667556;font-size:9px}.table-progress{display:flex;align-items:center;gap:10px}.progress{height:6px;background:#e7ecef;border-radius:99px;overflow:hidden;min-width:90px;flex:1}.progress i{height:100%;display:block;background:var(--sage)}.modules{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.module{display:grid;grid-template-columns:1fr auto;gap:10px;padding:15px;border:1px solid var(--line);border-radius:12px}.module span{display:block;font-size:11px;color:var(--muted)}.module .progress{grid-column:1/-1}.sprint,.task{border:1px solid var(--line);border-radius:12px;background:#fff;margin-top:10px;overflow:hidden}.sprint>summary,.task>summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:18px;padding:16px}.sprint>summary::-webkit-details-marker,.task>summary::-webkit-details-marker{display:none}.sprint>summary small,.sprint>summary strong{display:block}.sprint>summary small{font-size:9px;letter-spacing:.12em;color:var(--muted)}.sprint>summary>span:last-child,.task-meta{display:flex;align-items:center;gap:12px}.sprint-body{padding:0 12px 12px;background:#f7f9fa}.task{margin:10px 0 0}.task>summary{font-size:13px}.task>summary span:first-child{display:flex;gap:10px;align-items:center}.task>summary b{color:var(--muted)}.task-meta em{font-style:normal;font-weight:700}.task-body{padding:18px;border-top:1px solid var(--line)}.task-facts{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px}.task-facts span{font-size:12px;color:var(--muted)}.task-facts b{display:block;color:var(--ink);font-size:10px;text-transform:uppercase}.task-body section{margin-top:18px}.task-body h4{font-size:12px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin:0 0 8px}.markdown{font-size:14px}.markdown p{margin:7px 0}.markdown h2,.markdown h3,.markdown h4,.markdown h5,.markdown h6{margin:14px 0 6px;text-transform:none;letter-spacing:0;color:var(--ink)}.markdown pre{white-space:pre-wrap;background:#f1f4f6;padding:12px;border-radius:8px}.markdown blockquote{border-left:3px solid var(--blue);margin:10px 0;padding-left:12px;color:var(--muted)}.check{display:inline-grid;place-items:center;width:15px;height:15px;border:1px solid #a9b7c2;border-radius:3px;margin-right:7px;font-size:10px}.check.checked{background:#668697;color:white}.comment{border-left:2px solid #d9e1e6;padding:4px 0 4px 14px;margin:14px 0}.comment header{display:flex;gap:10px;font-size:12px}.comment time{color:var(--muted)}.empty{color:var(--muted);font-size:13px}.footer{text-align:center;color:var(--muted);font-size:11px;margin-top:28px}@media(max-width:760px){.shell{padding:18px 12px 40px}.hero,.panel{padding:20px}.kpis{grid-template-columns:repeat(2,1fr)}.modules{grid-template-columns:1fr}.task-facts{grid-template-columns:repeat(2,1fr)}.sprint>summary,.task>summary{align-items:flex-start;flex-direction:column}.gantt-row,.gantt-months{grid-template-columns:170px 1fr}}@media print{body{background:#fff}.shell{max-width:none;padding:0}.hero,.panel,.kpi{box-shadow:none;break-inside:avoid}.sprint>summary,.task>summary{break-after:avoid}.footer{margin-top:16px}}
</style></head><body><main class="shell"><header class="hero"><div class="brand">ESTIMADOR PRO · INFORME DE AVANCE</div><h1>${escapeHtml(projectName)}</h1><p class="lead">Estado consolidado del cronograma, los sprints y las tareas.</p><div class="meta"><span><b>Periodo</b>${escapeHtml(dateWindow(report.start, report.end))}</span><span><b>Responsable</b>${escapeHtml(manager)}</span><span><b>Fecha de corte</b>${formatDate(report.today)}</span>${hasProductDelivery ? `<span><b>Entrega del producto</b>${formatDate(report.productEnd) || 'Fecha pendiente'}</span>` : ''}</div></header>
${hasProductDelivery ? `<div class="scope-note">⚑ <span><strong>Alcance del producto hasta ${escapeHtml(report.totals.productDeliverySprintName)}.</strong> El progreso excluye ${report.totals.postDeliverySprints} ${report.totals.postDeliverySprints === 1 ? 'sprint posterior' : 'sprints posteriores'} de despliegue o estabilización.</span></div>` : ''}
<section class="kpis"><article class="kpi"><span>${hasProductDelivery ? 'Avance del producto' : 'Avance global'}</span><strong>${report.totals.globalProgress}%</strong>${progressBar(report.totals.globalProgress)}</article><article class="kpi"><span>Sprints del producto</span><strong>${report.totals.completedSprints}</strong><small> de ${report.totals.scopeSprints ?? report.totals.totalSprints}</small></article><article class="kpi"><span>Alcance completado</span><strong>${report.totals.completedTasks}</strong><small> de ${report.totals.scopeTasks ?? report.totals.totalTasks} tareas</small></article><article class="kpi"><span>${hasProductDelivery ? 'Calendario hasta entrega' : 'Calendario consumido'}</span><strong>${report.calendarElapsed}%</strong><small>${report.totals.overdueSprints ? ` · ${report.totals.overdueSprints} vencido(s)` : ' · sin sprints vencidos'}</small></article></section>
<section class="panel"><div class="panel-title"><div><h2>Ruta de entrega</h2><p>Visión compacta por sprint</p></div><p>${escapeHtml(dateWindow(report.start, report.end))}</p></div><div class="gantt"><div class="gantt-inner">${monthHeader}${sprintGantt(report, timeline)}</div></div></section>
<section class="panel"><div class="panel-title"><div><h2>Estado de los sprints</h2><p>Fechas, alcance y progreso</p></div></div><div class="table-wrap"><table><thead><tr><th>Sprint</th><th>Ventana</th><th>Estado</th><th>Tareas</th><th>Avance</th></tr></thead><tbody>${sprintRows}</tbody></table></div></section>
${report.modules.length ? `<section class="panel"><div class="panel-title"><div><h2>Avance por módulo</h2><p>A partir de la etiqueta módulo: en GitLab; usa el tipo de tarea cuando no existe.</p></div></div><div class="modules">${modules}</div></section>` : ''}
<section class="panel"><div class="panel-title"><div><h2>Detalle del trabajo</h2><p>Abre un sprint y luego una tarea para consultar su información.</p></div></div>${details}</section><footer class="footer">Generado el ${escapeHtml(generated)} con Estimador Pro</footer></main></body></html>`;
}

export function exportProgressToHtml(report, comments = {}) {
  const blob = new Blob([createProgressHtml(report, comments)], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${(report.project.name || 'Proyecto').replace(/[^a-z0-9áéíóúñ_-]+/gi, '_')}_avance.html`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
