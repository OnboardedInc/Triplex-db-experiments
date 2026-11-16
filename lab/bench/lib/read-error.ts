export interface ReadErrorCause {
  name?: string;
  tag?: string;
  code?: string;
  status?: number;
  reason?: string;
}

// [DX-T1-10] Why: an outer ReadError hides socket failures that invalidate a full pair; retain bounded typed causes.
// Rejected: retrying or dropping a failed read, or logging arbitrary error messages/URLs into portable traces.
export function describeReadError(error: unknown): {
  causes: ReadErrorCause[];
  truncated: boolean;
} {
  const pending: unknown[] = [error],
    seen = new Set<unknown>(),
    causes: ReadErrorCause[] = [];
  const label = (v: unknown) =>
    typeof v === "string" && /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(v) ? v : undefined;
  while (pending.length && causes.length < 8) {
    const value = pending.shift();
    if (seen.has(value)) continue;
    seen.add(value);
    if (!value || typeof value !== "object") {
      causes.push({ name: typeof value });
      continue;
    }
    const e = value as Record<string, unknown>,
      message = typeof e.message === "string" ? e.message : "";
    const reason = /deadline exceeded|timed? ?out/i.test(message)
      ? "deadline"
      : /socket hang up/i.test(message)
        ? "socket-hang-up"
        : /ECONNRESET/.test(message)
          ? "connection-reset"
          : undefined;
    causes.push({
      name: label(e.name),
      tag: label(e._tag),
      code: label(e.code),
      status: typeof e.status === "number" && Number.isFinite(e.status) ? e.status : undefined,
      reason,
    });
    if (e.cause !== undefined) pending.push(e.cause);
    if (Array.isArray(e.errors)) pending.push(...e.errors.slice(0, 8));
  }
  return { causes, truncated: pending.some((v) => !seen.has(v)) };
}
