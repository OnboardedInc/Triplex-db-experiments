// [DX-H4] Why: gateway wall clocks can jump independently of Node's monotonic epoch.
// Rejected: comparing System/currentTimeMillis directly to performance.timeOrigin + now.
export function completedMaintenanceInWindow(
  event: any,
  phase: string,
  from: number,
  to: number,
): boolean {
  return (
    event.phase === phase &&
    event.completed === true &&
    Number.isFinite(event.driverRequestedAtMs) &&
    Number.isFinite(event.driverCompletedAtMs) &&
    event.driverRequestedAtMs >= from &&
    event.driverCompletedAtMs >= event.driverRequestedAtMs &&
    event.driverCompletedAtMs < to
  );
}
export async function requestIndex(
  client: any,
  database: string,
  phase: string,
  now: () => number,
  waitMs: number,
) {
  const driverRequestedAtMs = now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const event: any = await Promise.race([
      client.request("POST", `/v2/db/${database}/request-index`, { waitMs }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(Error(`request-index exceeded ${waitMs} ms`)), waitMs);
      }),
    ]);
    if (
      event.database !== database ||
      typeof event.job !== "string" ||
      !/^[0-9a-f-]{36}$/.test(event.job) ||
      !/^[0-9]+$/.test(event.requestedT) ||
      typeof event.completed !== "boolean" ||
      !Number.isSafeInteger(event.requestedAtMs) ||
      (event.completed &&
        (!Number.isSafeInteger(event.completedAtMs) || event.completedAtMs < event.requestedAtMs))
    )
      throw Error("Invalid Datomic maintenance event binding");
    const driverCompletedAtMs = now();
    return {
      ...event,
      phase,
      driverRequestedAtMs,
      driverCompletedAtMs,
      completed: event.completed && driverCompletedAtMs - driverRequestedAtMs <= waitMs,
      clock: "driver monotonic epoch; request/response bounds enclose both gateway timestamps",
    };
  } catch (error) {
    return {
      database,
      phase,
      completed: false,
      driverRequestedAtMs,
      driverCompletedAtMs: now(),
      error: String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

// [DX-RD1] Why: Node can wake a timer before a fractional monotonic deadline.
// Rejected: a one-shot sleep or crediting a request that begins outside its own bin.
export async function scheduleMaintenanceBins(
  from: number,
  to: number,
  fullLength: boolean,
  now: () => number,
  sleep: (ms: number) => Promise<unknown>,
  request: (waitMs: number) => Promise<void>,
) {
  const binMs = fullLength ? 45_000 : Math.max(1, to - from);
  for (let start = from; start < to; start += binMs) {
    const deadline = Math.min(to, start + binMs), target = start + 10;
    if (target >= deadline - 100) continue;
    while (now() < target) await sleep(Math.max(1, target - now()));
    const remaining = Math.floor(deadline - now() - 100);
    if (remaining > 0) await request(Math.min(remaining, fullLength ? 44_900 : 600_000));
  }
}
