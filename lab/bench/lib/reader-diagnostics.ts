// [DX-H7] Why: inspect the actual reader clients without exposing backend internals in compositions.
// Rejected: inferred repairs from logical roundTrips (omits cache repair HTTP requests).
const clients = new Set<any>();
const installed = new WeakSet<object>();
export function installReaderDiagnostics(api: any) {
  const p = api.DatomicClient.prototype;
  if (installed.has(p)) return;
  installed.add(p);
  const reach = p.reachEntities,
    close = p.close;
  p.reachEntities = function (...args: any[]) {
    clients.add(this);
    return reach.apply(this, args);
  };
  p.close = function (...args: any[]) {
    clients.delete(this);
    return close.apply(this, args);
  };
}
export function readerDiagnostics() {
  return [...clients].map((c) => ({
    reach: structuredClone(c.reachDiagnostics),
    entities: {
      bytes: c.reachCache.bytes,
      peakBytes: c.reachCache.peakBytes,
      evictions: c.reachCache.evictions,
      size: c.reachCache.size,
      limit: c.reachCache.byteLimit,
    },
    rows: {
      bytes: c.rowCache.bytes,
      peakBytes: c.rowCache.peakBytes,
      evictions: c.rowCache.evictions,
      size: c.rowCache.size,
      limit: c.rowCache.byteLimit,
    },
  }));
}
