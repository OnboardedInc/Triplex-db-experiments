// [CX-VRQ01] Why: execute the checkout's TypeScript unchanged without installing dependencies.
// Rejected: builder dist (would not test the reviewed source).
import fs from 'node:fs';
import { registerHooks, stripTypeScriptTypes } from 'node:module';
import { fileURLToPath } from 'node:url';
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === '@triplex-build/triplex/content')
      return { url: new URL('./content-shim.mjs', import.meta.url).href, shortCircuit: true };
    if (specifier.endsWith('.js') && specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
      const url = new URL(specifier.slice(0, -3) + '.ts', context.parentURL);
      if (fs.existsSync(url)) return { url: url.href, shortCircuit: true };
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith('file:') && url.endsWith('.ts'))
      return { format: 'module', source: stripTypeScriptTypes(fs.readFileSync(fileURLToPath(url), 'utf8'), { mode: 'transform', sourceUrl: url }), shortCircuit: true };
    return next(url, context);
  },
});
