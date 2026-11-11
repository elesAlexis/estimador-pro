// Hook de resolución para `node --test`: el código de src/ usa imports relativos
// sin extensión (estilo Vite), que Node no resuelve por sí solo. Se agrega '.js'
// cuando el import original no se encuentra.
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.') && !/\.[cm]?jsx?$/.test(specifier)) {
      return next(`${specifier}.js`, context);
    }
    throw error;
  }
}
