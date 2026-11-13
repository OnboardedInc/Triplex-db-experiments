// @ts-nocheck -- Native Datomic counters have an engine-owned, version-pinned wire shape.
// [DX-T1-4] Why: database plus t binds native totals to the peer result without guessing by nearest time.
// Rejected: a t-only join (health and benchmark databases can both have t=1000).
export function bindNativeTransaction(gateway, candidates) {
  const hash = gateway.attributes?.databaseHash,
    t = gateway.attributes?.datomicT;
  if (!/^[0-9a-f]{64}$/.test(hash ?? "") || !/^\d+$/.test(t ?? "")) return null;
  const rows = candidates.filter(
    (e) =>
      e.nativeType === "triplex.NativeTransaction" &&
      e.process === "tx" &&
      e.run === gateway.run &&
      e.source === gateway.source &&
      e.slot === gateway.slot &&
      e.databaseHash === hash &&
      e.datomicT === t,
  );
  if (rows.length > 1) throw Error("Duplicate native database/t result");
  if (!rows.length) return null;
  const e = rows[0],
    s = e.nativeStats;
  if (
    !s ||
    !Number.isFinite(s.msec) ||
    !Number.isFinite(s["apply-msec"]) ||
    s.msec < 0 ||
    s["apply-msec"] < 0 ||
    s["apply-msec"] > s.msec + 0.5 ||
    e.start < gateway.start - 1 ||
    e.start > gateway.end + 1
  )
    throw Error("Invalid or stale native transaction counters");
  return {
    ...e,
    traceId: gateway.traceId,
    gatewayRoot: gateway.root,
    parent: gateway.spans.find((s) => s.name.startsWith("peer.transact-await"))?.id,
  };
}
