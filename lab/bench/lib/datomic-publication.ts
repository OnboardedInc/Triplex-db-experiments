// [DX-H1] Why: Datomic publication is the TS client's transact-result boundary (TARGETS / Q98).
// Rejected: stamping at the driver ACK or feed poll (would omit source-to-consumer time).
let observer: ((position: number, operationId: string, diagnostics?: unknown) => void) | undefined;
const installed = new WeakSet<object>();
export function observeDatomicPublication(callback: typeof observer) {
  observer = callback;
}
export function installDatomicPublication(api: any) {
  const prototype = api.DatomicClient.prototype;
  if (installed.has(prototype)) return;
  installed.add(prototype);
  const original = prototype.transact;
  prototype.transact = async function (db: string, input: any) {
    const result = await original.call(this, db, input);
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
