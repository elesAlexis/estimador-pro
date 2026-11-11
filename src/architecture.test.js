/**
 * Guardarraíl de la regla de dependencias (Clean Architecture).
 *
 * Las capas apuntan hacia adentro: shared ← domain ← application ← infrastructure ← presentación.
 * Este test lee los imports reales de `src/` y falla ante cualquier violación nueva.
 *
 * `DEUDA_CONOCIDA` lista las violaciones que ya existían cuando se escribió el
 * test. Cada fase del refactor borra entradas de esa lista; cuando queda vacía,
 * la regla pasa a ser inviolable. Nunca se agregan entradas nuevas.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = dirname(fileURLToPath(import.meta.url));

/** Qué puede importar cada capa, además de paquetes externos. */
const PUEDE_IMPORTAR = {
  shared: ['shared'],
  domain: ['domain', 'shared'],
  application: ['application', 'domain', 'shared'],
  infrastructure: ['infrastructure', 'application', 'domain', 'shared'],
  presentation: ['presentation', 'infrastructure', 'application', 'domain', 'shared'],
};

/** Carpetas de primer nivel que no son una capa propia son presentación. */
const CAPA_POR_CARPETA = {
  shared: 'shared',
  domain: 'domain',
  application: 'application',
  infrastructure: 'infrastructure',
  utils: 'presentation',
  components: 'presentation',
  pages: 'presentation',
  context: 'presentation',
};

const capaDe = (rutaRelativa) => CAPA_POR_CARPETA[rutaRelativa.split('/')[0]] ?? 'presentation';

const archivosFuente = (directorio = SRC) =>
  readdirSync(directorio).flatMap((entrada) => {
    const ruta = join(directorio, entrada);
    if (statSync(ruta).isDirectory()) return archivosFuente(ruta);
    return /\.jsx?$/.test(entrada) && !/\.test\.jsx?$/.test(entrada) ? [ruta] : [];
  });

const IMPORTS = /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]\s*\)?/g;

/** Resuelve un import relativo a una ruta con '/' desde src/, sin extensión. */
const destino = (archivo, especificador) => {
  const absoluto = resolve(dirname(archivo), especificador);
  return relative(SRC, absoluto).split(sep).join(posix.sep).replace(/\.jsx?$/, '');
};

const violaciones = () => {
  const encontradas = [];
  for (const archivo of archivosFuente()) {
    const origen = relative(SRC, archivo).split(sep).join(posix.sep);
    const capaOrigen = capaDe(origen);
    const codigo = readFileSync(archivo, 'utf8');
    for (const [, especificador] of codigo.matchAll(IMPORTS)) {
      if (!especificador.startsWith('.')) continue; // paquete externo
      const importado = destino(archivo, especificador);
      const capaDestino = capaDe(importado);
      if (PUEDE_IMPORTAR[capaOrigen].includes(capaDestino)) continue;
      encontradas.push(`${origen} → ${importado} (${capaOrigen} no puede importar ${capaDestino})`);
    }
  }
  return encontradas.sort();
};

/** Único archivo autorizado a elegir implementaciones de infraestructura. */
const COMPOSITION_ROOT = 'App.jsx';

const infraestructuraFueraDelRoot = () => {
  const encontradas = [];
  for (const archivo of archivosFuente()) {
    const origen = relative(SRC, archivo).split(sep).join(posix.sep);
    if (capaDe(origen) !== 'presentation' || origen === COMPOSITION_ROOT) continue;
    const codigo = readFileSync(archivo, 'utf8');
    for (const [, especificador] of codigo.matchAll(IMPORTS)) {
      if (!especificador.startsWith('.')) continue;
      const importado = destino(archivo, especificador);
      if (capaDe(importado) === 'infrastructure') encontradas.push(`${origen} → ${importado}`);
    }
  }
  return encontradas.sort();
};

/**
 * Violaciones heredadas de la integración con GitLab, pendientes de corregir.
 * Se vacía a lo largo del refactor; no se agregan entradas nuevas.
 */
const DEUDA_CONOCIDA = [];

/** Presentación que instancia infraestructura por su cuenta, pendiente de corregir. */
const DEUDA_COMPOSITION_ROOT = [];

test('la regla de dependencias entre capas se respeta', () => {
  const nuevas = violaciones().filter((v) => !DEUDA_CONOCIDA.includes(v));
  assert.deepEqual(nuevas, [], `Violaciones de capas:\n  ${nuevas.join('\n  ')}`);
});

test('la deuda conocida sigue existiendo (si ya se corrigió, quítala de la lista)', () => {
  const actuales = violaciones();
  const resueltas = DEUDA_CONOCIDA.filter((v) => !actuales.includes(v));
  assert.deepEqual(resueltas, [], `Deuda ya corregida, bórrala de DEUDA_CONOCIDA:\n  ${resueltas.join('\n  ')}`);
});

test('solo App.jsx elige implementaciones de infraestructura', () => {
  const nuevas = infraestructuraFueraDelRoot().filter((v) => !DEUDA_COMPOSITION_ROOT.includes(v));
  assert.deepEqual(nuevas, [], `Presentación instanciando infraestructura: ${nuevas.join(' | ')}`);
});

test('la deuda del composition root sigue existiendo (si ya se corrigió, quítala)', () => {
  const actuales = infraestructuraFueraDelRoot();
  const resueltas = DEUDA_COMPOSITION_ROOT.filter((v) => !actuales.includes(v));
  assert.deepEqual(resueltas, [], `Deuda ya corregida, bórrala de DEUDA_COMPOSITION_ROOT: ${resueltas.join(' | ')}`);
});
