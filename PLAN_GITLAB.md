# Plan de entrega: integración empresarial y base personal

Estado: implementación local completada. La conexión real, el registro OAuth y el despliegue quedan sujetos a los valores del servidor en `.env` y a la infraestructura empresarial.

## Resultado esperado

1. Aplicación actual disponible en GitLab Pages con acceso restringido y conectada a un proyecto de GitLab para consultar y gestionar sus issues, milestones y releases.
2. Una aplicación personal independiente y básica, preparada para consultar un grupo con varios proyectos de GitLab. Su desarrollo funcional posterior se hará por separado.

Se conserva el diseño actual del cronograma, dashboard y PDF en la edición empresarial. Las ampliaciones se concentran en conexión, sincronización y versiones. La identificación «Proyecto personal» del README y PDF se sustituirá por un texto neutral en esa edición.

## Decisiones y supuestos

- La empresa utiliza un servidor GitLab propio. «Pages» significa GitLab Pages en ese servidor; están pendientes su dirección, versión y servicios habilitados.
- «Versiones» significa releases de GitLab asociadas a tags del repositorio gestionado. La versión de la propia aplicación se mostrará aparte.
- Cada edición tendrá carpeta, repositorio privado, configuración OAuth y almacenamiento local propios. Se conservará el historial y la procedencia de los cambios; cambiar el diseño o crear otro repositorio no determina la titularidad del código.
- El repositorio que aloja la aplicación y el repositorio cuyos issues se gestionan se configurarán por separado, aunque puedan ser el mismo.
- Se mantienen React, JavaScript y la arquitectura por capas. La primera opción de autenticación será OAuth con PKCE, compatible con una aplicación estática. Cualquier necesidad de un servicio de autenticación adicional se definirá tras comprobar el servidor real.

## Entrega 1. Preparar la edición empresarial

### Trabajo

- Comprobar en el servidor empresarial la versión de GitLab, Pages, Runner, dominio HTTPS, acceso por red/VPN y configuración de acceso restringido. Adaptar la canalización a esa versión. Si Pages no está habilitado, registrar ese requisito de infraestructura antes de fijar una URL de publicación.
- Conservar una referencia versionada del estado actual y ejecutar las pruebas y la compilación.
- Ajustar documentación e identidad de la edición empresarial, sin referencias de cliente impuestas.
- Separar credenciales de los datos del proyecto. Retirar el campo de token manual y eliminarlo de persistencia, importaciones, exportaciones y registros de errores. Limpiar las credenciales heredadas sin perder tareas ni configuración no secreta.
- Configurar la URL base de Vite y navegación compatible con Pages. Preferir rutas con hash para las vistas y callback OAuth en la raíz, sin depender de reescrituras del servidor.
- Añadir una canalización de GitLab para instalar, probar, compilar y desplegar. Publicar únicamente archivos de producción.
- Configurar HTTPS y control de acceso a Pages. Verificar su acceso independientemente de la visibilidad del repositorio.

### Aceptación

- Cronograma y dashboard funcionan al navegar, recargar y abrir un enlace directo bajo la URL de Pages.
- Una persona sin acceso no puede abrir el sitio restringido.
- Los borradores existentes siguen disponibles en su origen; al cambiar de dominio se trasladan mediante respaldo JSON, ya que el almacenamiento del navegador no migra automáticamente.
- PDF, JSON, calendario y guardado conservan su funcionamiento.

## Entrega 2. Conexión segura con GitLab

### Trabajo

- Crear una aplicación OAuth independiente para la edición empresarial, con sus URL de retorno de desarrollo y producción.
- Implementar autorización con PKCE S256, comprobación de state, retorno de un solo uso y limpieza del código de la URL.
- Mantener access token y refresh token en memoria; nunca en localStorage, respaldos, código compilado o variables VITE de secretos. Tras una recarga se solicitará conexión de nuevo cuando sea necesario.
- El almacenamiento temporal del flujo contendrá solo state y verifier y se limpiará al completar o cancelar la conexión.
- Implementar caducidad, renovación durante la sesión, cierre de sesión y limpieza de datos de la cuenta al cambiar de usuario.
- Mostrar usuario conectado, servidor y proyecto de destino. Comprobar permisos antes de ofrecer acciones de escritura.
- Explicar los alcances reales de OAuth: elegir un proyecto dentro de la interfaz no limita por sí mismo el permiso api de GitLab a ese proyecto.
- Verificar OAuth, API, CORS, certificados y SSO contra el servidor concreto. Si este impide el flujo estático, precisar el servicio adicional necesario antes de desplegar.

### Aceptación

- Conexión, rechazo de autorización, state incorrecto, expiración, revocación y desconexión funcionan de forma controlada.
- Ninguna credencial aparece en los archivos publicados, datos persistidos, PDF o JSON.
- Las ediciones personales y empresariales no comparten sesión ni caché.

## Entrega 3. Issues y milestones fiables

### Modelo

| Aplicación | GitLab |
| --- | --- |
| Sprint | Milestone de proyecto |
| Tarea | Issue del proyecto |
| Tipo y prioridad | Labels administradas por la aplicación |
| Responsable | Usuario asignado cuando exista una asociación explícita; el rol libre se conserva aparte |
| Tarea al 100% | Issue cerrado |
| Todas las tareas completas | Milestone cerrado, mediante una acción visible de sincronización |
| Porcentaje intermedio, WBS y fechas reales | Metadatos de Estimador en una sección identificada de la descripción del issue |

### Trabajo

- Leer todos los resultados paginados del proyecto: milestones activos/cerrados, issues, etiquetas y miembros necesarios para asignación.
- Ofrecer tres recorridos: importar existentes, publicar borradores y actualizar elementos vinculados.
- Para un proyecto ya existente, comenzar por consultar e importar. No recalcular ni sobrescribir sus fechas por abrirlo; estimar y aplicar una nueva planificación será una acción explícita.
- Identificar los vínculos por servidor, project_id, tipo de recurso e identificador. En GitLab, el iid de un issue solo es único dentro de su proyecto.
- Registrar cada creación exitosa de inmediato y usar una marca estable de origen para reconciliar reintentos tras respuestas inciertas. Guardar avances parciales y no duplicar tareas o milestones.
- Clonar una tarea o sprint crea una nueva identidad local; no hereda el vínculo del original.
- Comparar la versión leída y updated_at antes de sobrescribir. Mostrar qué cambió en GitLab y permitir conservar o aplicar los cambios por campo.
- Mantener GitLab como referencia del contenido publicado y los borradores como cambios locales pendientes. Los datos sincronizados deben poder recuperarse en otro navegador mediante una nueva consulta.
- Preservar etiquetas, comentarios y texto ajenos a la aplicación. No sustituir descripciones completas al actualizar metadatos propios.
- Usar la API de estimaciones cuando proceda y definir explícitamente su conversión con los días hábiles del estimador; evitar comandos repetidos dentro de descripciones.
- Sincronizar cierre y reapertura sin inventar fechas reales. Un issue cerrado confirma finalización, pero su fecha de cierre no se convertirá automáticamente en fecha real de ejecución.
- Añadir vista previa de cambios: crear, actualizar, cerrar o reabrir. Excluir eliminación automática.
- Gestionar permisos insuficientes, límites de solicitudes, desconexión y errores parciales con un resumen por elemento y reintentos seguros.

### Aceptación

- Importar y volver a sincronizar no duplica elementos ni modifica datos sin cambios.
- El fallo del tercer issue conserva los dos primeros y permite continuar.
- Reintentar después de una creación de resultado incierto encuentra el recurso antes de crear otro.
- Un cambio hecho directamente en GitLab aparece en la aplicación y un conflicto no se sobrescribe silenciosamente.
- Cambiar de cuenta, servidor o proyecto nunca reutiliza vínculos del destino anterior.
- El dashboard distingue porcentaje estimado del trabajo y proporción de issues cerrados; no los presenta como la misma métrica.

## Entrega 4. Versiones y salida empresarial

### Trabajo

- Añadir una sección compacta de Versiones: listar releases, ver notas, tag y milestones asociados.
- Permitir crear o actualizar una release sobre un tag existente, con vista previa y publicación explícita. La creación de tags y la modificación del código quedan fuera de esta primera entrega.
- Distinguir publicación de una release de cierre de un milestone; una no dispara la otra automáticamente.
- Mostrar también la versión instalada de Estimador para identificar despliegues.
- Probar el recorrido en un proyecto de prueba y después configurar el destino empresarial indicado.
- Publicar desde una versión identificable y documentar cómo regresar a la versión anterior.

### Aceptación

- Se consultan y actualizan issues, milestones y releases con los permisos correspondientes.
- La release queda asociada al tag elegido y una publicación fallida no se presenta como exitosa.
- Pruebas unitarias y de integración con API simulada, compilación, comprobaciones de red real y navegación a 360, 390, 768, 1024 y 1280 px.
- Verificar recorridos con teclado, acceso restringido, retorno OAuth y exportaciones en Pages.

## Entrega 5. Base personal independiente

Nombre provisional: Project Atlas. Su primera versión se limita a una base navegable y de consulta.

### Incluido

- Proyecto y repositorio privado separados, configuración de entorno propia y datos de demostración.
- Modelo: servidor → grupo/subgrupos → proyectos → milestones e issues. Admitir milestones de grupo y proyecto sin contarlos dos veces.
- Navegación inicial: Resumen, Proyectos y Milestones.
- Dashboard básico: proyectos activos, issues abiertos/cerrados, milestones activos y vencidos. Los elementos sin fecha se muestran como «Sin fecha».
- Lectura desde GitLab con OAuth propio y alcance read_api, una vez se proporcionen grupo y registro OAuth personales.
- Paginar proyectos e issues, identificar caché por cuenta/servidor/proyecto y limpiar al desconectar.
- Filtros por proyecto y estado, actualización manual y enlaces al recurso original.
- Ejecución local funcional desde el inicio; su despliegue privado en Pages se configura con las direcciones personales cuando estén disponibles.

### Para el desarrollo posterior

- Edición y creación desde el dashboard personal, sincronización de escritura, Gantt global, vistas de carga de trabajo y métricas históricas.
- GitHub como proveedor adicional.
- Intercambio de mejoras entre aplicaciones mediante cambios revisados y documentados.

### Aceptación

- Se puede recorrer una demostración con varios proyectos sin conexión.
- Al conectar, se muestran todos los proyectos permitidos del grupo y sus resultados paginados, no solo la primera página.
- La base personal no realiza escrituras en GitLab. Sus contadores se contrastan con datos reales de prueba.

## Orden y datos necesarios

Orden: preparar aplicación actual → OAuth → lectura y sincronización → releases y despliegue empresarial → base personal.

Para concretar la conexión y publicación se necesitan:

1. URL del servidor GitLab empresarial, su versión y disponibilidad de Pages/Runner.
2. Repositorio para alojar la aplicación y proyecto que gestionará, que pueden coincidir.
3. Application ID OAuth y URL de retorno registrada; no enviar tokens ni secretos por chat.
4. URL del GitLab personal, grupo de consulta y nombre/repositorio de la aplicación personal.

La preparación de código, pruebas simuladas y demostración puede avanzar antes de disponer de esos datos. La validación real de acceso y el despliegue requieren los destinos y la configuración efectiva.

## Referencias técnicas

- GitLab Pages: https://docs.gitlab.com/user/project/pages/
- Control de acceso: https://docs.gitlab.com/user/project/pages/pages_access_control/
- OAuth con PKCE: https://docs.gitlab.com/api/oauth2/
- Issues: https://docs.gitlab.com/api/issues/
- Milestones de proyecto: https://docs.gitlab.com/api/milestones/
- Releases: https://docs.gitlab.com/api/releases/
- Proyectos de un grupo: https://docs.gitlab.com/api/groups/
