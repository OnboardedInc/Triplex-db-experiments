// [DX-B8] Why: replace only H5's hard-coded ownership helper; queries, data, order and fingerprint checks remain original.
// Rejected: patching lab/bench or claiming the original helper's bytes were executed.
export async function resolve(specifier,context,nextResolve){
 if(context.parentURL&&new URL(specifier,context.parentURL).pathname.endsWith('/lab/bench/lib/w0-lease.ts'))
  return {url:new URL('./w0-lease.ts',import.meta.url).href,shortCircuit:true};
 return nextResolve(specifier,context);
}
