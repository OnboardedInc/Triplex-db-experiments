// [DX-JRN1] Server probe for the bounded journal routes and the field-history page on a 1 billion copy (or any lean
// database). Read-only. Each request's cost is the gateway's own: index entries examined (the bounded answer's
// "examined", or the old route's counter in /v2/admin/scan-stats) and store time (x-tx2-gateway-micros). Run it against a
// gateway this branch serves, alone (the old-route counters are reset per request):
//   node --import tsx lab/experiments/EXP-DX1/jrn1/probe.ts URL DB SEALED_HEAD ORDINARY_ENTITY HEAVY_ENTITY [--attribute A]
//     [--far P] [--entity-pages N] [--feed-pages N] [--old-below]
// --old-below also sends the old unbounded page from below the sealed head (it may hold the single journal permit for
// minutes; only on a gateway nobody else uses). Output: one JSON line per request, then a summary line.
import assert from "node:assert/strict";

const [url, db, sealedText, ordinary, heavy] = process.argv.slice(2);
assert(url && db && sealedText && ordinary && heavy, "usage: probe.ts URL DB SEALED_HEAD ORDINARY_ENTITY HEAVY_ENTITY [options]");
const option = (name: string, fallback: string) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1]! : fallback;
};
const sealed = Number(sealedText);
const attribute = option("--attribute", ":task/field-0");
const far = Number(option("--far", "87002"));
const entityPages = Number(option("--entity-pages", "200"));
const feedPages = Number(option("--feed-pages", "5"));
const oldBelow = process.argv.includes("--old-below");

const call = async (path: string, body: unknown, timeoutMs = 120_000) => {
  const started = performance.now();
  const response = await fetch(url + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await response.text();
  const micros = Number(response.headers.get("x-tx2-gateway-micros"));
  assert(response.ok, `${path} ${response.status} ${text.slice(0, 300)}`);
  return { json: JSON.parse(text), storeMs: Number.isFinite(micros) ? micros / 1000 : null, roundTripMs: performance.now() - started, bytes: text.length };
};
const oldExamined = async (route: string) => {
  const stats = (await call("/v2/admin/scan-stats", undefined)).json;
  return stats.journalExamined?.[route]?.entries ?? null;
};
const reset = () => call("/v2/admin/scan-stats/reset", {});
const log = (probe: string, data: Record<string, unknown>) => console.log(JSON.stringify({ probe, ...data }));
const summary: Record<string, unknown> = {};

const basis = await call(`/v1/db/${db}/basis`, undefined);
const head = Number(basis.json.position?.v ?? basis.json.position);
assert(Number.isSafeInteger(head) && head >= sealed, "head " + head);
const validAt = Date.now() + 86_400_000;
summary.head = head;

// 1. Newest 20 journals: the old route and one bounded page.
for (let i = 0; i < 3; i++) {
  await reset();
  const old = await call(`/v2/db/${db}/transactions`, { after: head - 20, limit: 20 });
  const examined = await oldExamined("transactions");
  const bounded = await call(`/v2/db/${db}/transactions`, { after: head - 20, limit: 20, bounded: true });
  assert.deepEqual(bounded.json.transactions, old.json.transactions);
  log("newest-20", { run: i, oldExamined: examined, oldStoreMs: old.storeMs, boundedExamined: bounded.json.examined,
    stopped: bounded.json.stopped, boundedStoreMs: bounded.storeMs, journals: old.json.transactions.length });
}

// 2. A page from below the sealed head (after = --far), bounded, following cursors for --feed-pages pages.
{
  let cursor = far, journals = 0;
  const pages: unknown[] = [];
  for (let i = 0; i < feedPages; i++) {
    const page = await call(`/v2/db/${db}/transactions`, { after: cursor, limit: 1000, bounded: true });
    journals += page.json.transactions.length;
    pages.push({ after: cursor, examined: page.json.examined, stopped: page.json.stopped, next: page.json.next,
      journals: page.json.transactions.length, storeMs: page.storeMs, bytes: page.bytes });
    log("below-sealed-head", pages.at(-1) as Record<string, unknown>);
    if (page.json.stopped === "end") break;
    cursor = page.json.next;
  }
  summary.belowSealedHead = { from: far, journals, pages: pages.length };
  if (oldBelow) {
    await reset();
    try {
      const old = await call(`/v2/db/${db}/transactions`, { after: far, limit: 1000 }, 600_000);
      log("below-sealed-head-old", { journals: old.json.transactions.length, examined: await oldExamined("transactions"), storeMs: old.storeMs });
    } catch (error) {
      log("below-sealed-head-old", { error: String(error) });
    }
  }
}

// 3. An entity's journal, newest 20, on an ordinary and on a heavily saved entity: bounded pages followed by nextBefore
//    for at most --entity-pages pages (the old lean route reads every transaction and is not sent).
for (const [label, entity] of [["ordinary", ordinary], ["heavy", heavy]] as const) {
  for (let run = 0; run < 2; run++) {
    const found: [string, number][] = [];
    let before: number | undefined, pages = 0, examined = 0, storeMs = 0, maxStoreMs = 0, last = "";
    while (found.length < 20 && pages < entityPages) {
      const page = await call(`/v2/db/${db}/entity-transactions`, {
        entityId: entity, limit: 20 - found.length, basis: { recordedPosition: head, validAt }, bounded: true,
        ...(before === undefined ? {} : { beforePosition: before }),
      });
      pages++;
      examined += page.json.examined;
      storeMs += page.storeMs ?? 0;
      maxStoreMs = Math.max(maxStoreMs, page.storeMs ?? 0);
      found.push(...page.json.positions);
      last = page.json.stopped;
      if (last === "end" || last === "limit") break;
      before = page.json.nextBefore;
    }
    log(`entity-journal-${label}`, { run, entity, found: found.length, pages, examined, storeMs, maxPageStoreMs: maxStoreMs,
      stopped: last, reachedBelow: before ?? null, newest: found.slice(0, 3) });
  }
}

// 4. One field's history of the heavily saved entity: the page (newest 40) and the old unbounded history read.
for (let run = 0; run < 3; run++) {
  const page = await call(`/v1/db/${db}/read`, { pattern: { entityId: heavy }, history: true, historyPage: { attribute, limit: 40 } });
  log("field-history-page", { run, rows: page.json.rows.length, next: page.json.historyNext, storeMs: page.storeMs, bytes: page.bytes });
}
for (let run = 0; run < 3; run++) {
  const all = await call(`/v1/db/${db}/read`, { pattern: { entityId: heavy }, history: true });
  const field = all.json.rows.filter((r: unknown[] | Record<string, unknown>) => JSON.stringify(r).includes(JSON.stringify(attribute)));
  log("field-history-unbounded", { run, entityRows: all.json.rows.length, fieldRowsApprox: field.length, storeMs: all.storeMs, bytes: all.bytes });
}
log("summary", summary);
