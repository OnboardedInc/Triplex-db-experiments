// [CX-VQNODELAY-R2] Why: bind source probes to the exact newly declared Undici runtime.
// Rejected: a global dispatcher or source substitution in the client under review.
export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'undici') return { url: 'file:///Users/sam/projects/triplex-db-2/node_modules/.pnpm/undici@7.29.1/node_modules/undici/index.js', shortCircuit: true };
  if (specifier === 'typescript') return { url: 'file:///Users/sam/projects/triplex-db-2/node_modules/typescript/lib/typescript.js', shortCircuit: true };
  return nextResolve(specifier, context);
}
