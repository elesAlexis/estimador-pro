# Correcciones del estimador

## Comportamiento implementado

- Los respaldos se normalizan antes de importar y se rechazan con ubicación del campo si contienen datos incompatibles o identificadores duplicados. Se mantienen campos opcionales de respaldos antiguos y borradores con duración vacía o cero.
- Un proyecto se importa en una sola transición. La persistencia mantiene las claves históricas y distingue ausencia, lectura fallida y escritura fallida. El estado «Guardado» exige que ambas partes se hayan guardado.
- Al detectar datos corruptos se suspende el guardado. Se pueden descargar los originales y reintentar la lectura. Antes de importar sobre ellos se archiva una copia con una clave `ep_recovery_*`; si no hay espacio, se exige descargar una copia actualizada. No se permite sobrescribir originales que todavía no se pueden leer.
- Por debajo de 1024 px las tareas usan tarjetas con los mismos controles de escritorio. Hay acciones para subir, bajar y cambiar de sprint, sin depender del arrastre.
- Confirmaciones y calendario comparten diálogo, foco inicial, contención del foco, Escape y retorno del foco. Los campos y botones tienen nombres accesibles.
- Mientras el calendario esté pendiente, las fechas no se presentan como definitivas y el PDF queda deshabilitado. Respuestas tardías se descartan y los datos inválidos de API/caché recurren al calendario local.

## Verificación

Ejecutar `npm test` y `npm run build` desde la raíz del proyecto.

Resultado final: 90 pruebas aprobadas, compilación de producción correcta y `git diff --check` sin incidencias.

Las pruebas cubren validación, reemplazo de proyecto, guardado parcial, reintento, recuperación de datos corruptos, preservación de ediciones pendientes, respuestas fuera de orden, Navidad de 2026 e integridad al mover tareas.

Se comprobó en navegador:

- Cronograma y dashboard en 360, 390, 768, 1024 y 1280 px, sin desbordamiento de página. Los campos de tareas no quedaron recortados.
- Rechazo de un archivo con identificadores duplicados sin reemplazar el proyecto.
- Importación válida, edición y persistencia tras recargar.
- Movimiento dentro de un sprint, cambio de sprint y reordenamiento de sprints.
- Foco inicial en Cancelar, recorrido de Tab dentro del diálogo y cierre con Escape.
- PDF deshabilitado ante borradores y descarga de un PDF cuando las duraciones eran válidas.

La conexión de control del navegador se interrumpió después de estas comprobaciones. No se pudo repetir la revisión visual tras los últimos ajustes de recuperación y ancho del Gantt, ni confirmar la restauración del respaldo original de la sesión de pruebas. El último proyecto de prueba observado se llamaba «Prueba de calendario y guardado»; antes se había descargado `Nuevo_Proyecto_Ecommerce_backup.json`.

## Banco de integración manual

Con `npm run dev`, abrir `/scripts/browser-checks.html` en el servidor local. Este banco utiliza únicamente memoria y no modifica el almacenamiento real. No forma parte de la compilación de producción.

| Escenario | Comprobación esperada |
| --- | --- |
| normal | Aparece Guardado y la entrega del 25/12/2026 se programa el 28/12/2026. |
| cuota | Aparece un aviso persistente; tras Restablecer almacenamiento y Reintentar, se guardan ambas partes. |
| corrupto | El guardado está suspendido y la inspección muestra cero escrituras. La importación válida conserva los originales en una entrada de recuperación. |
| bloqueado | El guardado permanece suspendido; tras restablecer y reintentar se recupera el proyecto almacenado si no hay ediciones pendientes. |
| calendario | Las fechas y el PDF esperan hasta pulsar Resolver calendario de prueba. |

Este banco se compiló correctamente, pero su ejecución interactiva quedó pendiente por el fallo de conexión mencionado.

## Límites conservados

El almacenamiento sigue siendo local a cada navegador. Las dos claves históricas no constituyen una transacción atómica: un fallo parcial se informa y requiere reintentar o descargar respaldo. No se incorporaron dependencias, backend ni un sistema de pruebas de navegador adicional.

## Ajuste de calendario y diseño del Gantt — 14/09/2026

- Tooltip compartido de festivos con nombre, fecha y aclaración de día no hábil. Disponible con cursor, foco y toque; se renderiza dentro de la capa del diálogo del calendario.
- Gantt compacto: columna de tareas y encabezados fijos, avance sobre la barra programada, filas por sprint, ampliación de días y expansión/contracción global.
- Fechas reales únicamente cuando hay un rango real completo y válido. Se conservan las fechas parciales en los datos.
- Festivos y fines de semana diferenciados; leyenda y detalles accesibles en las barras. Desplazamiento contenido dentro del cronograma.
- Verificación: 92 pruebas aprobadas y compilación de producción correcta. Dos pruebas nuevas cubren rangos reales ausentes, incompletos, invertidos e inválidos.
- Pendiente: inspección visual y recorridos interactivos del nuevo diseño. La herramienta de navegador falla al iniciar con «failed to write kernel assets». No se modificaron los datos del proyecto para estas comprobaciones.

## Seguimiento visible en el cronograma — 14/09/2026

- Estado y porcentaje editables en cada tarea; acción directa para completarla. El encabezado del sprint cuenta tareas completas y solo declara finalización cuando todas están al 100%, independientemente del redondeo ponderado.
- Filtro de tareas pendientes que conserva los índices originales para movimientos. Al completar una tarea oculta por el filtro, el foco vuelve al sprint; se anuncia el total completado.
- Observaciones separadas del panel de seguimiento. Confirmar mismas fechas guarda inicio y fin reales en una sola transición validada; cambios posteriores de duración o planificación no sobrescriben ese registro.
- El Gantt conserva una sola barra para fechas coincidentes y muestra la comparación cuando difieren. Señala diferencia del fin en días calendario, cambios solo de inicio y tareas/sprints completos.
- Verificación: 95 pruebas aprobadas y compilación correcta. Nuevas pruebas sobre finalización exacta, confirmación atómica, conservación de fechas y comparación de rangos.
- Pendiente: revisión visual e interacción en navegador; la herramienta sigue fallando al iniciar con «failed to write kernel assets».

## PDF e identidad personal — 14/09/2026

- Reporte A4 horizontal con identidad propia, indicadores en tonos minerales, resúmenes por sprint y columnas separadas para fechas programadas, reales y avance.
- Se omite el cliente heredado en el PDF. El reporte se identifica como «Estimador Pro · Proyecto personal» y el README documenta su carácter personal y posible uso empresarial.
- Fechas coincidentes se resumen como «Según lo programado»; registros parciales indican qué fecha falta. Los datos del navegador no se modifican al exportar.
- Se generaron y revisaron visualmente dos muestras de cuatro páginas, incluyendo nombres y responsables largos. Se verificaron encabezados, tablas, márgenes, pie, fechas y ausencia de cliente heredado mediante extracción de texto.
- 97 pruebas aprobadas, incluidas dos pruebas nuevas de PDF. Se corrigió la validación del proveedor de integración nulo que provocaba fallos en dos pruebas existentes de recuperación.
- La vista previa contiene datos ficticios. Los PDFs generados y archivos temporales se excluyen de Git. No se publicaron cambios en GitHub.
