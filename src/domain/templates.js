/**
 * Datos semilla del proyecto: la plantilla base y el banco de tareas frecuentes.
 * Son contenido de negocio (nombres, roles, duraciones estimadas), no estilo.
 */
export const BASE_TEMPLATE = [
  {
    id: 'sprint-0',
    name: 'Preparación y Planeación',
    tasks: [
      { id: 't-01', title: 'Definición de Arquitectura', role: 'Líder Técnico', duration: 2, type: 'dev', priority: 'alta', description: 'Definir la arquitectura del sistema, patrones a usar y stack tecnológico.', wbs: '1.1', progress: 0 },
      { id: 't-02', title: 'Creación de Repositorios y Ambientes', role: 'DevOps', duration: 1, type: 'dev', priority: 'alta', description: 'Configurar repositorios Git, ambientes de dev, QA y producción.', wbs: '1.2', progress: 0 },
      { id: 't-03', title: 'Modelado de Base de Datos', role: 'Backend', duration: 2, type: 'dev', priority: 'alta', description: 'Diseñar el modelo de datos y relaciones del sistema.', wbs: '1.3', progress: 0 },
    ]
  },
  {
    id: 'sprint-1',
    name: 'Sprint 1 - Base Core',
    tasks: [
      { id: 't-11', title: 'Desarrollo de Login / Autenticación', role: 'Fullstack', duration: 3, type: 'dev', priority: 'alta', description: 'Implementar autenticación de usuarios con JWT.', wbs: '2.1', progress: 0 },
      { id: 't-12', title: 'Estructura Base del Home', role: 'Frontend', duration: 2, type: 'dev', priority: 'media', description: 'Crear la estructura y layout base de la pantalla principal.', wbs: '2.2', progress: 0 },
      { id: 't-13', title: 'Pruebas Unitarias Iniciales', role: 'QA', duration: 1, type: 'qa', priority: 'media', description: 'Pruebas unitarias sobre el módulo de autenticación.', wbs: '2.3', progress: 0 },
      { id: 't-14', title: 'Despliegue a Pruebas', role: 'DevOps', duration: 1, type: 'deploy', priority: 'baja', description: 'Desplegar la versión actual al ambiente de QA.', wbs: '2.4', progress: 0 },
      { id: 't-15', title: 'Revisión con Cliente Final', role: 'Product Owner', duration: 1, type: 'review', priority: 'alta', description: 'Reunión de revisión del sprint con el cliente para validar avances.', wbs: '2.5', progress: 0 },
    ]
  }
];

export const COMMON_TASKS_BANK = [
  { title: 'Revisión con Cliente Final', role: 'Product Owner', duration: 1, type: 'review', priority: 'alta', description: '', wbs: '' },
  { title: 'Desarrollo de CRUD', role: 'Fullstack', duration: 3, type: 'dev', priority: 'media', description: '', wbs: '' },
  { title: 'Despliegue a Pruebas', role: 'DevOps', duration: 1, type: 'deploy', priority: 'baja', description: '', wbs: '' },
  { title: 'Despliegue a Producción', role: 'DevOps', duration: 1, type: 'deploy', priority: 'alta', description: '', wbs: '' },
  { title: 'Ajustes Sprint (Bugs)', role: 'Desarrollador', duration: 2, type: 'dev', priority: 'media', description: '', wbs: '' },
];
