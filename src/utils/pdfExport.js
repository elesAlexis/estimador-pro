/** Reporte de seguimiento: composición horizontal y paleta mineral. */
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { formatDate } from '../shared/calendarDate';
import { TASK_TYPES, PRIORITY_CONFIG } from './templateData';
import { calculateProgress, sumDurations, getSprintCompletion, getTaskProgress } from '../domain/metrics';

const C = {
  ink: '#304355', muted: '#647487', line: '#dfe6eb', paper: '#f5f7f9', white: '#ffffff',
  blue: '#718e9f', sage: '#81968a', sand: '#aa977e', mauve: '#968a9c',
};
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const text = (doc, value, x, y, size = 9, color = C.ink, weight = 'normal', options = {}) => {
  doc.setFont('helvetica', weight);
  doc.setFontSize(size);
  doc.setTextColor(...rgb(color));
  doc.text(value, x, y, options);
};
const fill = (doc, color) => doc.setFillColor(...rgb(color));
const projectStatus = value => ({ planeacion: 'Planeación', en_curso: 'En curso', en_pausa: 'En pausa', finalizado: 'Finalizado' }[value] || 'Planeación');
const dateRange = (start, end) => `${formatDate(start) || 'Sin registrar'}\nal ${formatDate(end) || 'sin registrar'}`;

export const createProjectPDF = (projectInfo, sprints, totals) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight();
  const margin = 16, width = pw - margin * 2;
  const name = projectInfo.name || 'Proyecto sin nombre';
  const issued = new Date().toLocaleDateString('es-CO');
  doc.setProperties({ title: name, creator: 'Estimador Pro', subject: 'Cronograma y seguimiento del proyecto' });
  const rule = y => {
    doc.setDrawColor(...rgb(C.line)); doc.setLineWidth(.25); doc.line(margin, y, pw - margin, y);
  };

  // Identidad discreta y contexto del documento.
  fill(doc, '#eaf0f4'); doc.roundedRect(margin, 12, 9, 9, 2, 2, 'F');
  doc.setDrawColor(...rgb(C.blue)); doc.setLineWidth(.65);
  doc.line(margin + 2, 15, margin + 7, 15);
  doc.line(margin + 2, 17, margin + 5, 17);
  doc.line(margin + 4, 19, margin + 7, 19);
  text(doc, 'ESTIMADOR PRO', margin + 12, 16, 9, C.ink, 'bold');
  text(doc, 'Planificación y seguimiento', margin + 12, 20, 7, C.muted);
  text(doc, 'CRONOGRAMA Y SEGUIMIENTO', pw - margin, 16, 8, C.muted, 'bold', { align: 'right' });
  text(doc, `Emitido el ${issued}`, pw - margin, 20, 7, C.muted, 'normal', { align: 'right' });
  rule(25);

  text(doc, 'PANORAMA DEL PROYECTO', margin, 33, 7, C.blue, 'bold');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(23);
  const nameLines = doc.splitTextToSize(name, width);
  text(doc, nameLines, margin, 43, 23, C.ink, 'bold');
  let y = 43 + (nameLines.length - 1) * 9 + 7;
  const meta = [projectStatus(projectInfo.status)];
  if (projectInfo.manager) meta.push(`Responsable: ${projectInfo.manager}`);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  const metaLines = doc.splitTextToSize(meta.join('   /   '), width);
  text(doc, metaLines, margin, y, 8, C.muted);
  y += metaLines.length * 4 + 5;

  const cards = [
    ['DÍAS HÁBILES', `${totals.totalDays}`, C.blue, '#f1f6f8'],
    ['TAREAS / SPRINTS', `${totals.totalTasks} / ${totals.totalSprints}`, C.sand, '#faf7f2'],
    [totals.productDeliverySprintId ? 'AVANCE DEL PRODUCTO' : 'AVANCE GLOBAL', `${totals.globalProgress}%`, C.mauve, '#f7f4f8'],
    ['INICIO PROGRAMADO', formatDate(projectInfo.startDate) || 'Pendiente', C.blue, '#f3f6f8'],
    [totals.productDeliverySprintId ? 'ENTREGA DEL PRODUCTO' : 'ENTREGA ESTIMADA', formatDate(totals.estimatedEndDate) || 'Pendiente', C.sage, '#f3f7f4'],
  ];
  const gap = 4, cardW = (width - 4 * gap) / 5;
  cards.forEach(([label, value, accent, bg], i) => {
    const x = margin + i * (cardW + gap);
    fill(doc, bg); doc.roundedRect(x, y, cardW, 22, 2, 2, 'F');
    fill(doc, accent); doc.roundedRect(x + 4, y + 4, 6, .8, .4, .4, 'F');
    text(doc, label, x + 4, y + 9, 6.5, C.muted, 'bold');
    text(doc, value, x + 4, y + 17, i > 2 ? 12 : 16, C.ink, 'bold');
  });
  y += 30;
  text(doc, 'PLAN DE TRABAJO', margin, y, 8, C.ink, 'bold');
  text(doc, 'Duración en días hábiles · Fechas reales solo cuando están registradas', pw - margin, y, 7, C.muted, 'normal', { align: 'right' });
  y += 7;

  sprints.forEach((sprint, si) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    const titleLines = doc.splitTextToSize(sprint.name || `Sprint ${si + 1}`, width - 83);
    const headerH = Math.max(17, titleLines.length * 4 + 10);
    if (y + headerH + 24 > ph - 18) { doc.addPage(); y = 26; }
    fill(doc, C.paper); doc.roundedRect(margin, y, width, headerH, 2, 2, 'F');
    fill(doc, '#e2e9ef'); doc.roundedRect(margin + 3, y + 3, 10, 10, 2, 2, 'F');
    text(doc, String(si + 1).padStart(2, '0'), margin + 8, y + 9.5, 9, C.ink, 'bold', { align: 'center' });
    text(doc, titleLines, margin + 17, y + 6, 10, C.ink, 'bold');
    const { completed, isComplete } = getSprintCompletion(sprint.tasks);
    text(doc, `${sumDurations(sprint.tasks)} días hábiles   /   ${completed} de ${sprint.tasks.length} tareas completadas`, margin + 17, y + headerH - 3.5, 7, C.muted);
    const progress = calculateProgress(sprint.tasks);
    text(doc, isComplete ? 'Sprint completado' : `${progress}% de avance`, pw - margin - 4, y + 6.5, 8, isComplete ? '#496456' : C.muted, 'bold', { align: 'right' });
    fill(doc, '#e0e7ec'); doc.roundedRect(pw - margin - 49, y + 10, 45, 2, 1, 1, 'F');
    if (progress > 0) { fill(doc, C.sage); doc.roundedRect(pw - margin - 49, y + 10, Math.max(2, 45 * progress / 100), 2, 1, 1, 'F'); }
    y += headerH + 2;

    if (!sprint.tasks.length) {
      text(doc, 'Sin tareas registradas.', margin + 4, y + 6, 8, C.muted);
      y += 17; return;
    }
    const rows = sprint.tasks.map((task, ti) => {
      const progress = getTaskProgress(task);
      const status = progress === 100 ? 'Completada' : progress > 0 ? 'En curso' : 'Pendiente';
      const actual = !task.realStart && !task.realEnd ? 'Sin registrar'
        : task.realStart === task.calculatedStart && task.realEnd === task.calculatedEnd ? 'Según lo\nprogramado'
        : dateRange(task.realStart, task.realEnd);
      return [task.wbs || task.calculatedWbs || `${si + 1}.${ti + 1}`,
        `${task.title || 'Tarea sin nombre'}\n${TASK_TYPES[task.type]?.label || task.type}`,
        task.role || 'Sin asignar', `${task.duration || 0}`,
        dateRange(task.calculatedStart, task.calculatedEnd), actual,
        `${status}\n${progress}%`, PRIORITY_CONFIG[task.priority]?.label || 'Media'];
    });
    doc.autoTable({
      startY: y,
      head: [['WBS', 'TAREA / TIPO', 'RESPONSABLE', 'DÍAS', 'PROGRAMADO', 'REAL', 'AVANCE', 'PRIORIDAD']],
      body: rows, theme: 'plain', rowPageBreak: 'avoid',
      margin: { left: margin, right: margin, top: 26, bottom: 18 },
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 3, textColor: rgb(C.ink), overflow: 'linebreak', valign: 'middle', lineColor: rgb(C.line), lineWidth: { bottom: .15 } },
      headStyles: { fontSize: 6.5, fontStyle: 'bold', textColor: rgb(C.muted), fillColor: rgb(C.white), cellPadding: { top: 3, bottom: 3, left: 3, right: 3 } },
      alternateRowStyles: { fillColor: rgb('#fafbfc') },
      columnStyles: {
        0: { cellWidth: 14, textColor: rgb(C.muted), fontSize: 7 },
        1: { cellWidth: 'auto' }, 2: { cellWidth: 30 }, 3: { cellWidth: 12, halign: 'center' },
        4: { cellWidth: 34, fontSize: 7.5 }, 5: { cellWidth: 34, fontSize: 7.5 },
        6: { cellWidth: 24, fontSize: 7.5 }, 7: { cellWidth: 20, fontSize: 7.5 },
      },
      didParseCell(data) {
        if (data.section !== 'body') return;
        const task = sprint.tasks[data.row.index];
        if (data.column.index === 6 && getTaskProgress(task) === 100) data.cell.styles.textColor = rgb('#496456');
        if (data.column.index === 7) data.cell.styles.textColor = rgb(task.priority === 'alta' ? '#915656' : task.priority === 'baja' ? C.muted : '#746047');
      },
    });
    y = doc.lastAutoTable.finalY + 8;
  });

  const count = doc.internal.getNumberOfPages();
  for (let page = 1; page <= count; page++) {
    doc.setPage(page);
    if (page > 1) {
      text(doc, 'ESTIMADOR PRO / SEGUIMIENTO', margin, 15, 8, C.muted, 'bold');
      doc.setFontSize(8);
      const runningName = doc.splitTextToSize(name, width * .55)[0];
      text(doc, runningName, pw - margin, 15, 8, C.muted, 'normal', { align: 'right' });
      rule(20);
    }
    rule(ph - 13);
    text(doc, 'Estimador Pro · Cronograma de proyecto', margin, ph - 8, 7, C.muted);
    text(doc, `${page} / ${count}`, pw / 2, ph - 8, 7, C.muted, 'normal', { align: 'center' });
    text(doc, issued, pw - margin, ph - 8, 7, C.muted, 'normal', { align: 'right' });
  }
  return doc;
};

export const exportToPDF = (projectInfo, sprints, totals) => {
  const doc = createProjectPDF(projectInfo, sprints, totals);
  doc.save(`${(projectInfo.name || 'Proyecto').replace(/\s+/g, '_')}_cronograma.pdf`);
};
