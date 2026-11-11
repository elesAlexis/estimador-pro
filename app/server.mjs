import express from 'express';
import { fileURLToPath } from 'node:url';

const app = express();
const port = Number(process.env.PORT ?? 8080);
const publicDir = fileURLToPath(new URL('./public/', import.meta.url));

app.disable('x-powered-by');
app.use(express.static(publicDir));
app.listen(port, '0.0.0.0', () => console.log(`Estimador Pro en el puerto ${port}`));
