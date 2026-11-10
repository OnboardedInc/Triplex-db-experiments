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
  try {
    const event = await client.request("POST", `/v2/db/${database}/request-index`, { waitMs });
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
  }
}
