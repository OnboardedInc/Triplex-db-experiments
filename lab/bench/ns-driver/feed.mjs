// [EXP-NSR] Why: evaluator-owned FD01 validators preserve content checks without executing candidate code. Rejected: runtime package imports.
const natural = (s) => {
  if (typeof s !== "string" || !/^(0|[1-9][0-9]*)$/.test(s))
    throw new Error("Noncanonical feed coordinate");
};
const keys = (o, allowed) => {
  if (Object.keys(o).some((k) => !allowed.includes(k))) throw new Error("Unexpected feed field");
};
const identity = (s) => {
  if (typeof s !== "string" || s.length === 0) throw new Error("Missing feed identity");
};
/** Reject extra fields as well as incomplete legacy tuples; never invent an assertion identity. */
export function validateFeedEntry(entry) {
  identity(entry.stream);
  natural(entry.epoch);
  natural(entry.offset);
  keys(entry, [
    "stream",
    "epoch",
    "offset",
    "kind",
    ...(entry.kind === "commit"
      ? ["transactions"]
      : entry.kind === "epoch"
        ? ["previousEpoch"]
        : entry.kind === "seal"
          ? ["stamp"]
          : []),
  ]);
  if (entry.kind === "epoch") natural(entry.previousEpoch);
  else if (entry.kind === "seal") natural(entry.stamp);
  else if (entry.kind === "commit") {
    if (!entry.transactions.length) throw new Error("Empty commit resolution");
    const positions = new Set();
    for (const tx of entry.transactions) {
      keys(tx, [
        "positions",
        "txIds",
        "operationId",
        "commandIds",
        "stamp",
        "stampStatus",
        "changes",
      ]);
      identity(tx.operationId);
      if (!tx.positions.length || !tx.txIds.length)
        throw new Error("Missing transaction identities");
      for (const p of tx.positions) {
        natural(p);
        if (positions.has(p)) throw new Error("Duplicate position");
        positions.add(p);
      }
      for (const id of [...tx.txIds, ...tx.commandIds]) identity(id);
      if (tx.stampStatus === "decided") {
        if (tx.stamp === null) throw new Error("Missing decided stamp");
        natural(tx.stamp);
      } else if (tx.stampStatus !== "pending-RT01" || tx.stamp !== null)
        throw new Error("Invalid stamp status");
      for (const c of tx.changes) {
        keys(c, [
          "op",
          "entity",
          "attribute",
          "validFrom",
          "validTo",
          "position",
          "assertionId",
          "erasureSeq",
        ]);
        if (!["assert", "retract", "erase"].includes(c.op))
          throw new Error("Unknown change operation");
        identity(c.entity);
        identity(c.attribute);
        identity(c.assertionId);
        natural(c.position);
        if (!tx.positions.includes(c.position)) throw new Error("Change outside transaction");
        if (
          !Number.isFinite(c.validFrom) ||
          (c.validTo !== null && (!Number.isFinite(c.validTo) || c.validTo <= c.validFrom))
        )
          throw new Error("Invalid valid-time interval");
        if (c.op === "erase") {
          if (c.erasureSeq === undefined) throw new Error("Missing erasure sequence");
          natural(c.erasureSeq);
        } else if (c.erasureSeq !== undefined)
          throw new Error("Erasure sequence on ordinary change");
      }
    }
  } else if (entry.kind !== "aborted") throw new Error("Unknown feed resolution");
}
/** Stable wire bytes: object insertion order from upstream readers is irrelevant. */
export function feedBytes(entry) {
  validateFeedEntry(entry);
  const sort = (v) =>
    Array.isArray(v)
      ? v.map(sort)
      : v !== null && typeof v === "object"
        ? Object.fromEntries(
            Object.entries(v)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, x]) => [k, sort(x)]),
          )
        : v;
  return JSON.stringify(sort(entry));
}
export function assertFeedCursor(source, cursor) {
  if (cursor.source !== source) throw new Error("Feed cursor source mismatch");
}
export function sameFeedClock(a, b) {
  if (a?.primitive === "CLOCK_MONOTONIC" || b?.primitive === "CLOCK_MONOTONIC") {
    const valid = (d) =>
      d?.primitive === "CLOCK_MONOTONIC" &&
      /^[a-f0-9-]{36}$/i.test(d.bootId) &&
      /^[1-9][0-9]*$/.test(d.timeNs);
    return (
      valid(a) &&
      valid(b) &&
      a.primitive === "CLOCK_MONOTONIC" &&
      b.primitive === "CLOCK_MONOTONIC" &&
      a.bootId === b.bootId &&
      a.timeNs === b.timeNs
    );
  }
  const valid = (d) =>
    d?.primitive === "node-hrtime-v1" &&
    d.origin === "host-boot" &&
    /^[a-f0-9]{64}$/.test(d.host) &&
    /^[a-f0-9]{64}$/.test(d.boot);
  return valid(a) && valid(b) && a.host === b.host && a.boot === b.boot && a.origin === b.origin;
}
export function feedPositionKey(p) {
  identity(p.source);
  identity(p.stream);
  natural(p.epoch);
  natural(p.position);
  return JSON.stringify([p.source, p.stream, p.epoch, p.position]);
}
// [EXP-FD01-R3] Why: equal labels do not establish origins; the independent producer record fixes publication time.
// Rejected: performance.now from different processes, or a late map/ACK timestamp renamed as publication (R2-F1).
export function publicationLagMs(publication, known, producerRecord) {
  if (!publication) throw new Error("Missing source publication instant");
  if (!sameFeedClock(publication.domain, known.domain))
    throw new Error("Publication clock origin mismatch");
  if (!producerRecord) throw new Error("Missing producer publication record");
  if (
    feedPositionKey(publication) !== feedPositionKey(known) ||
    feedPositionKey(publication) !== feedPositionKey(producerRecord) ||
    !publication.publicationId ||
    !publication.recordId ||
    publication.publicationId !== producerRecord.publicationId ||
    publication.recordId !== producerRecord.recordId ||
    publication.atNs !== producerRecord.atNs ||
    !sameFeedClock(publication.domain, producerRecord.domain)
  )
    throw new Error("Publication differs from producer record");
  natural(publication.atNs);
  natural(known.atNs);
  const elapsed = BigInt(known.atNs) - BigInt(publication.atNs);
  if (elapsed < 0n || elapsed > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error("Invalid publication interval");
  return Number(elapsed) / 1e6;
}
export function auditFeed(pages, expected) {
  if (!expected.entries.length || !pages.length) throw new Error("Void feed audit");
  const actual = pages.flatMap((p) => p.entries);
  if (pages.some((p) => p.cursor.source !== expected.source))
    throw new Error("Feed source binding mismatch");
  if (pages.at(-1).cursor.token !== expected.finalToken)
    throw new Error("Published prefix not reached");
  if (actual.length !== expected.entries.length) throw new Error("Feed gap/extra resolution");
  const subjectLast = new Map();
  const positions = new Set();
  const commands = new Set();
  const coordinates = new Set();
  let prior;
  for (const [i, e] of actual.entries()) {
    if (feedBytes(e) !== feedBytes(expected.entries[i]))
      throw new Error(`Feed content/resolution mismatch at ${i}`);
    const coordinate = JSON.stringify([e.stream, e.epoch, e.offset]);
    if (coordinates.has(coordinate)) throw new Error("Repeated source resolution");
    coordinates.add(coordinate);
    if (
      prior &&
      (e.stream !== prior.stream ||
        BigInt(e.epoch) < BigInt(prior.epoch) ||
        (e.epoch === prior.epoch && BigInt(e.offset) <= BigInt(prior.offset)))
    )
      throw new Error("Source resolution order violation");
    if (prior && e.epoch !== prior.epoch && (e.kind !== "epoch" || e.previousEpoch !== prior.epoch))
      throw new Error("Unresolved epoch transition");
    prior = e;
    if (e.kind !== "commit") continue;
    for (const tx of e.transactions) {
      for (const command of tx.commandIds) {
        if (commands.has(command)) throw new Error("Resent command allocated new position");
        commands.add(command);
      }
      for (const p of tx.positions) {
        const key = JSON.stringify([e.stream, e.epoch, p]);
        if (positions.has(key)) throw new Error("Duplicate position");
        positions.add(key);
        for (const subject of new Set(
          tx.changes.filter((c) => c.position === p).map((c) => c.entity),
        )) {
          const s = JSON.stringify([e.stream, e.epoch, subject]);
          if ((subjectLast.get(s) ?? -1n) >= BigInt(p))
            throw new Error("Per-subject order violation");
          subjectLast.set(s, BigInt(p));
        }
      }
    }
  }
  return { positions: positions.size, resolutions: actual.length };
}
