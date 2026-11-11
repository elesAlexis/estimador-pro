import express from 'express';
import { fileURLToPath } from 'node:url';

const app = express();
const port = Number(process.env.PORT ?? 8080);
const publicDir = fileURLToPath(new URL('./public/', import.meta.url));
const storageUrl = process.env.STORAGE_URL ? new URL(process.env.STORAGE_URL) : null;
const storageToken = process.env.STORAGE_API_TOKEN;
const uuidPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

app.disable('x-powered-by');
app.use('/api', express.json({ limit: '2mb' }));
app.use('/api', (_request, response, next) => {
  response.set('Cache-Control', 'no-store');
  if (!storageUrl || !storageToken) {
    return response.status(503).json({ error: 'Levanta la aplicación y el servicio de respaldos con Docker Compose.' });
  }
  next();
});

async function requestStorage(response, path, options = {}) {
  const headers = { Authorization: `Bearer ${storageToken}` };
  if (options.body) headers['Content-Type'] = 'application/json';
  try {
    const upstream = await fetch(new URL(path, storageUrl), {
      ...options,
      headers,
      signal: AbortSignal.timeout(5000),
    });
    const result = await upstream.json();
    if (path === '/health' && upstream.ok) result.storageHost = storageUrl.hostname;
    return response.status(upstream.status).json(result);
  } catch {
    return response.status(502).json({ error: 'El servicio de respaldos no respondió.' });
  }
}

app.get('/api/health', (_request, response) => requestStorage(response, '/health'));

app.post('/api/backups', (request, response) => {
  const { projectInfo, sprints } = request.body ?? {};
  if (typeof projectInfo?.name !== 'string' || !Array.isArray(sprints)) {
    return response.status(400).json({ error: 'Envía la información del proyecto y la lista de sprints.' });
  }
  const { integration, ...info } = projectInfo;
  return requestStorage(response, '/backups', {
    method: 'POST',
    body: JSON.stringify({ projectInfo: info, sprints }),
  });
});

app.get('/api/backups/:id', (request, response) => {
  const { id } = request.params;
  if (!uuidPattern.test(id)) return response.status(400).json({ error: 'El ID del respaldo no es válido.' });
  return requestStorage(response, `/backups/${id}`);
});

app.use('/api', (_request, response) => response.status(404).json({ error: 'Ruta desconocida.' }));
app.use(express.static(publicDir));
app.use((error, _request, response, next) => {
  if (error.type === 'entity.too.large') return response.status(413).json({ error: 'El respaldo supera el límite de 2 MB.' });
  if (error.type === 'entity.parse.failed') return response.status(400).json({ error: 'El respaldo debe ser JSON válido.' });
  return next(error);
});

app.listen(port, '0.0.0.0', () => console.log(`Estimador Pro en el puerto ${port}`));
