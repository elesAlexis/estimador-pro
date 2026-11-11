# Estimador Pro

Aplicación para planificar y dar seguimiento a proyectos de software mediante tareas, sprints y un cronograma de días hábiles.

## Funcionalidades

- Cronograma editable con festivos de Colombia y fechas programadas y reales.
- Seguimiento del avance de tareas y sprints, con filtro de pendientes.
- Dashboard operativo con indicadores y diagrama de Gantt por tarea.
- Informe de Avance con indicadores ejecutivos, ruta por sprint, módulos y detalle de trabajo.
- Exportación del informe de Avance a un HTML autónomo, listo para abrir o compartir sin instalar la aplicación.
- Guardado local, recuperación de datos e importación y exportación de respaldos JSON.
- Exportación del cronograma y su seguimiento a PDF.
- Conexión OAuth con GitLab, importación de issues y milestones, vista previa de cambios y comentarios en el informe de Avance.

## Desarrollo local

Requiere Node.js y npm.

```sh
npm install
npm run dev
```

## Verificación

```sh
npm test
npm run build
```

La aplicación utiliza React y Vite. Los datos del proyecto se guardan en el navegador. Para trasladarlos a otro equipo, utiliza un respaldo JSON.

El HTML se genera desde la vista **Avance**. Incluye los datos visibles en el informe y los comentarios públicos de GitLab que se hayan cargado. Las notas marcadas como internas no se incluyen en el archivo compartible.

## Configuración de GitLab

Copia `.env.example` como `.env` y completa únicamente valores públicos:

```env
VITE_GITLAB_URL=https://gitlab.miempresa.com
VITE_GITLAB_PROJECT=grupo/proyecto
VITE_GITLAB_CLIENT_ID=application_id_oauth
VITE_BASE_PATH=/ruta-pages/
```

Registra como URI de retorno la raíz exacta de desarrollo o de Pages. La aplicación OAuth debe ser pública/no confidencial, usar PKCE y tener alcance `api`. No agregues un Client Secret: las variables `VITE_` quedan incluidas en los archivos publicados. Los tokens se mantienen únicamente en memoria y se solicita conectar otra vez después de recargar.

La canalización `.gitlab-ci.yml` prueba y compila antes de ofrecer el despliegue manual de Pages. En un servidor propio deben estar habilitados Runner, Pages, HTTPS y el control de acceso correspondiente. La visibilidad privada del repositorio no garantiza por sí sola que Pages sea privado.

El repositorio contiene la aplicación y su documentación. Los datos de proyectos empresariales, respaldos y credenciales deben mantenerse fuera del repositorio público.
