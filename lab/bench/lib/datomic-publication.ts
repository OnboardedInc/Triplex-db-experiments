// [DX-H1] Why: Datomic publication is the TS client's transact-result boundary (TARGETS / Q98).
// Rejected: stamping at the driver ACK or feed poll (would omit source-to-consumer time).
let observer: ((position: number, operationId: string, diagnostics?: unknown) => void) | undefined;
const installed = new WeakSet<object>();
// [DX-R3-P9] Why: alternating arms need actual source refusals and adapter replay counters without extra requests.
// Rejected: inferring clock conflicts from terminal writer outcomes (internal retries can hide them).
const measurements = new Set<{ requests: number; statuses: Record<string, number>; errors: Record<string, number>; counters: Record<string, number> }>();
export function datomicWriterDiagnostics() {
  const out = { requests: 0, statuses: {} as Record<string, number>, errors: {} as Record<string, number>, counters: {} as Record<string, number> };
  for (const row of measurements) {
    out.requests += row.requests;
    for (const field of ["statuses", "errors", "counters"] as const)
      for (const [key, count] of Object.entries(row[field])) out[field][key] = (out[field][key] ?? 0) + count;
  }
  return out;
}
export function observeDatomicPublication(callback: typeof observer) {
  observer = callback;
}
export function installDatomicPublication(api: any) {
  const prototype = api.DatomicClient.prototype;
  if (installed.has(prototype)) return;
  installed.add(prototype);
  const records = new WeakMap<object, { requests: number; statuses: Record<string, number>; errors: Record<string, number>; counters: Record<string, number> }>();
  const measuring = process.env.DX_R3_SOURCE_DIAGNOSTICS === "1";
  const request = prototype.request;
  if (measuring) prototype.request = async function (...args: any[]) {
    const row = records.get(this);
    if (row) row.requests++;
    try {
      const result = await request.apply(this, args);
      if (row) row.statuses["2xx"] = (row.statuses["2xx"] ?? 0) + 1;
      return result;
    } catch (error: any) {
      if (row) {
        const status = String(error?.status ?? "transport"), code = String(error?.code ?? error?.name ?? "unknown");
        row.statuses[status] = (row.statuses[status] ?? 0) + 1;
        row.errors[code] = (row.errors[code] ?? 0) + 1;
      }
      throw error;
    }
  };
  const original = prototype.transact;
  prototype.transact = async function (db: string, input: any) {
    if (!records.has(this)) {
      const row = { requests: 0, statuses: {}, errors: {}, counters: this.commitDiagnostics ?? {} };
      records.set(this, row); measurements.add(row);
    }
    let result;
    try {
      result = await original.call(this, db, input);
    } catch (error: any) {
      // [DX-R3-P7] Why: the first source refusal or local encoding error can be hidden by later suffix failures.
      // Rejected: logging only the final seed exception (cannot distinguish clock rejection from a missing send).
      if (process.env.DX_R3_SOURCE_DIAGNOSTICS === "1")
        console.log(
          JSON.stringify({
            kind: "adapter-source-rejection",
            db,
            operationId: input.operationId,
            sequence: input.sendSequence,
            sourceK: input.sourceK,
            position: input.position,
            claims: input.claims,
            code: error?.code,
            status: error?.status,
            maximum: error?.maximum,
            message: error?.message ?? String(error),
            name: error?.name,
          }),
        );
      throw error;
    }
    if (observer) {
      const position = Number(result?.position?.v);
      if (
        result?.position?.t !== "long" ||
        typeof result?.position?.v !== "string" ||
        !/^(0|[1-9][0-9]*)$/.test(result.position.v) ||
        !Number.isSafeInteger(position) ||
        position < 1 ||
        !Number.isSafeInteger(input.position) ||
        !Number.isSafeInteger(result.delta) ||
        position !== input.position + result.delta ||
        result.operationId !== input.operationId ||
        typeof input.operationId !== "string" ||
        !input.operationId
      )
        throw new Error("Datomic publication response/input binding mismatch");
      observer(position, input.operationId, result.diagnostics ?? result.commitDiagnostics);
    }
    return result;
  };
}
