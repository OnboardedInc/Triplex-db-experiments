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
