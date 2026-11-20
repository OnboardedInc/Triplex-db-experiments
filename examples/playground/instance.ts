import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { actionService, listen } from "./http.ts";
import type { Invoke } from "./actions.ts";
import type { Source } from "./service.ts";
import { Stack, type StackOptions } from "./stack.ts";

export type InstanceOptions = StackOptions & {
  apiPort: number;
  token?: string;
  fixture: Source | ((signal: AbortSignal) => Promise<Source>);
};

export async function openInstance(options: InstanceOptions) {
  await mkdir(options.directory, { recursive: true, mode: 0o700 });
  const shutdown = new AbortController();
  const signal = options.signal
    ? AbortSignal.any([shutdown.signal, options.signal])
    : shutdown.signal;
  const token = options.token ?? randomUUID();
  let invoke: Invoke | undefined;
  const server = await listen(options.apiPort, {
    getInvoke: () => invoke,
    token,
    stop: () => shutdown.abort(),
  });
  const stack = new Stack({ ...options, signal });
  let playground: import("./service.ts").Playground | undefined;
  let attemptedStack = false;
  const ready = (async () => {
    const fixture =
      typeof options.fixture === "function" ? await options.fixture(signal) : options.fixture;
    signal.throwIfAborted();
    const started = performance.now();
    attemptedStack = true;
    // [DX-PLAY1] Why: a full replay can create millions of gateway logs before the UI is ready.
    // Rejected: charging an unbounded trace archive to the dataset's local disk budget.
    const gatewaySpans = !("manifest" in fixture && fixture.manifest.tier === "full");
    const urls = await stack.start(gatewaySpans);
    const stackMs = performance.now() - started;
    const seedStart = performance.now();
    process.env["TRIPLEX_TRACE_LEVEL"] = "full";
    const { Playground } = await import("./service.ts");
    const { Timings } = await import("./timings.ts");
    playground = new Playground(fixture, urls, options.prefix);
    await playground.seed(signal);
    signal.throwIfAborted();
    invoke = actionService(
      playground,
      new Timings(gatewaySpans ? stack.traceDir : undefined, options.prefix, urls.source),
    );
    return { stackMs, seedMs: performance.now() - seedStart, gatewaySource: urls.source, urls };
  })();
  let closing: Promise<Awaited<ReturnType<Stack["stop"]>>> | undefined;
  return {
    server,
    ready,
    signal,
    stack,
    close: () =>
      (closing ??= (async () => {
        shutdown.abort();
        await ready.catch(() => {});
        await server.close();
        await playground?.close();
        const empty = attemptedStack
          ? await stack.stop()
          : { ps: [], volume: [], network: [], image: [] };
        await rm(options.directory, { recursive: true, force: true });
        return empty;
      })()),
  };
}
