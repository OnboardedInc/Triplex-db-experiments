import assert from "node:assert/strict";

export interface Interval {
  start: number;
  end: number;
}
export interface ArchivedSpan extends Interval {
  id: string;
  parent?: string;
  name: string;
  attributes?: Record<string, unknown>;
  synchronous?: boolean;
}

// [DX-RD1] Why: these milestones add back to Node's HTTP span even when a callback stamp and a JVM stamp overlap.
// Rejected: clipping negative cross-process gaps before subtracting gateway wall time (inflates the residual).
export function wireIntervals(
  http: ArchivedSpan,
  node: readonly ArchivedSpan[],
  gateway: Interval,
) {
  const socket = (name: string) => {
    const found = node.filter((s) => s.parent === http.id && s.name === name);
    assert(found.length <= 1, `Duplicate ${name} for one exchange`);
    return found[0];
  };
  const write = socket("socket.queue-and-write"),
    head = socket("socket.wait-first-byte"),
    body = socket("socket.body-read");
  if (!write || !head || !body) return;
  assert(
    http.start <= write.start &&
      write.start <= write.end &&
      write.end === head.start &&
      head.start <= head.end &&
      head.end === body.start &&
      body.start <= body.end &&
      body.end <= http.end &&
      gateway.start <= gateway.end,
    "Inconsistent HTTP callback milestones",
  );
  const parts = {
    httpSetup: write.start - http.start,
    queueAndWrite: write.end - write.start,
    writeToGateway: gateway.start - write.end,
    gatewayWall: gateway.end - gateway.start,
    gatewayEndToHeaders: head.end - gateway.end,
    headersToBodyEnd: body.end - body.start,
    bodyEndToHttpEnd: http.end - body.end,
  };
  assert(
    Math.abs(Object.values(parts).reduce((n, ms) => n + ms, 0) - (http.end - http.start)) < 0.01,
  );
  return { parts, responseWindow: { start: gateway.end, end: head.end } };
}

export function coveredMs(window: Interval, events: readonly Interval[]) {
  if (window.end <= window.start) return 0;
  const clipped = events
    .filter((e) => e.start < window.end && e.end > window.start)
    .map((e) => ({ start: Math.max(e.start, window.start), end: Math.min(e.end, window.end) }))
    .sort((a, b) => a.start - b.start);
  let end = window.start;
  let ms = 0;
  for (const e of clipped) {
    ms += Math.max(0, e.end - Math.max(e.start, end));
    end = Math.max(end, e.end);
  }
  return ms;
}
