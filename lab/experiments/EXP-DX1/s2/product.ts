// [DX-S2] The product's save path for lab gates: TriplesLive over the Datomic adapter (makeDatomicRuntime), exactly as
// the console and the playground open it, with every wire request and answer recorded so a gate can say which writer
// took each commit and replay the same requests to a control gateway.
// Why: the product path, not the lab's command() framing, is what the save-shape decision is about.
// Rejected: calling DatomicClient.transact with hand-built rows (that is the lab producer the scorecard already uses).
// Static imports of the built packages, so the production gate's bundle carries them into its container.
import { Effect, ManagedRuntime } from "effect";
import * as coreModule from "../../../../packages/core/dist/index.js";
import * as runtimeModule from "../../../../packages/core/dist/runtime/index.js";
import * as datomicModule from "../../../../packages/datomic/dist/index.js";

export const core: any = coreModule;
export const runtimeApi: any = runtimeModule;
export const datomic: any = datomicModule;
export { Effect };

export type Wire = {
  input: Record<string, any>;
  ack?: Record<string, any>;
  error?: { status?: number; code?: string; message: string };
};

export interface ProductStore {
  readonly db: string;
  readonly scope: string;
  readonly client: any;
  readonly wire: Wire[];
  run<A>(effect: any): Promise<A>;
  exit(effect: any): Promise<any>;
  transact(ops: any[], meta: Record<string, unknown>): Promise<any>;
  close(): Promise<void>;
}

/**
 * Open the product's store on a strict lean scope. `options` go to makeDatomicRuntime (for example orderedSaves).
 * `lose` may mark a wire request whose reply should be dropped after the gateway answered (a lost reply).
 */
export async function openProduct(
  url: string,
  scopeName: string,
  options: Record<string, unknown> = {},
  lose?: (input: Record<string, any>) => boolean,
): Promise<ProductStore> {
  // A scope JSON (["triplex-scope-v1", env, tenant, database, generation]) is used as given; a plain name is a test scope.
  const scope = scopeName.startsWith("[")
    ? (() => {
        const [, env, tenant, database, generation] = JSON.parse(scopeName);
        return runtimeApi.DatabaseScope.make({ env, tenant, database, generation });
      })()
    : runtimeApi.DatabaseScope.test(scopeName);
  const creator = new datomic.DatomicClient(url);
  let db: string;
  try {
    const created = await creator.create(scope, "lean", true, 35_000);
    if (!created.strictRecordClocks) throw new Error("expected a strict-clock scope");
    db = created.db;
  } finally {
    creator.close();
  }
  const wire: Wire[] = [];
  let client: any;
  const definition = datomic.makeDatomicRuntime({ url, layout: "lean", serverRecordTime: true, ...options });
  const layer = definition.layer({ scope, capabilities: runtimeApi.Capabilities.none });
  const managed: any = (ManagedRuntime as any).make(layer);
  // The adapter keeps its client private; reach it through the first transact by wrapping the prototype once.
  const proto = datomic.DatomicClient.prototype;
  if (!proto.__dxS2Wrapped) {
    const original = proto.transact;
    proto.transact = async function (this: any, name: string, input: any, onSent?: any) {
      const hook = (this as any).__dxS2Hook as ((n: string, i: any, call: () => Promise<any>) => Promise<any>) | undefined;
      return hook ? hook(name, input, () => original.call(this, name, input, onSent)) : original.call(this, name, input, onSent);
    };
    proto.__dxS2Wrapped = true;
  }
  const hook = async (name: string, input: any, call: () => Promise<any>) => {
    if (name !== db) return call();
    const { onSent: _drop, ...plain } = input;
    const entry: Wire = { input: structuredClone(plain) };
    wire.push(entry);
    try {
      const ack = await call();
      entry.ack = structuredClone(ack);
      if (lose?.(plain)) throw Object.assign(new Error("DX-S2 lost reply (dropped after the gateway answered)"), { lostReply: true });
      return ack;
    } catch (error: any) {
      if (!entry.error) entry.error = { status: error?.status, code: error?.code, message: String(error?.message ?? error) };
      throw error;
    }
  };
  const findClient = () => client;
  // Every DatomicClient the runtime made answers to this hook; the runtime makes exactly one per store.
  const install = proto.request;
  proto.request = function (this: any, ...args: any[]) {
    if (!this.__dxS2Hook) this.__dxS2Hook = hook;
    client ??= this;
    return install.apply(this, args);
  };
  let triples: any;
  try {
    triples = await managed.runPromise(Effect.service(core.Triples));
    await managed.runPromise(triples.currentPosition());
  } finally {
    proto.request = install;
  }
  return {
    db,
    scope,
    get client() {
      return findClient();
    },
    wire,
    run: (effect) => managed.runPromise(effect),
    exit: (effect) => managed.runPromiseExit(effect),
    transact: (ops, meta) => managed.runPromise(triples.transact(ops, meta)),
    close: () => managed.dispose(),
  } as ProductStore;
}

type Fact = { readonly e: string; readonly a: string; readonly v: { readonly type: string; readonly value: string } };
/**
 * [DX-S2] The lab producer's hook (`prep1/server-produce.ts` `phase`, `ProductSave`): one store per gateway URL on an
 * existing scope; each save is one product transact of the same facts (valid from 0, as command() writes them) and
 * retirements, with the producer's command ID. Returns the request the SDK sent and the gateway's answer.
 */
export async function productSaver(urls: readonly string[], scopeJson: string, options: Record<string, unknown>) {
  const stores: ProductStore[] = [];
  for (const url of urls) stores.push(await openProduct(url, scopeJson, options));
  const take = (store: ProductStore, commandId: string) => {
    const index = store.wire.findIndex((w) => w.ack && w.input.claims?.[0]?.commandId === commandId);
    if (index < 0) throw new Error("No acknowledged request for " + commandId);
    const [entry] = store.wire.splice(index, 1);
    for (let i = store.wire.length - 1; i >= 0; i--)
      if (store.wire[i]!.input.claims?.[0]?.commandId === commandId) store.wire.splice(i, 1);
    return { input: entry!.input as any, ack: entry!.ack as any };
  };
  return {
    stores,
    save: async (peer: number, _entity: string, facts: readonly Fact[], old: readonly { id: string }[], commandId: string) => {
      const store = stores[peer % stores.length]!;
      await store.transact(
        [
          ...facts.map((f) => ({ op: "assert", entityId: f.e, attribute: f.a, value: f.v, validFrom: 0 })),
          ...old.map((r) => ({ op: "retract", id: r.id })),
        ],
        { commandId },
      );
      return take(store, commandId);
    },
    /** A setup save of several owners (seeding) through the same path; returns the sent request and the answer. */
    seed: async (facts: readonly Fact[], commandId: string, validFrom: number) => {
      const store = stores[0]!;
      await store.transact(facts.map((f) => ({ op: "assert", entityId: f.e, attribute: f.a, value: f.v, validFrom })), { commandId });
      return take(store, commandId);
    },
    /** The last request sent for a command whose save did not return (a refusal or an unknown outcome). */
    sentFor: (commandId: string) => {
      for (const store of stores)
        for (let i = store.wire.length - 1; i >= 0; i--)
          if (store.wire[i]!.input.claims?.[0]?.commandId === commandId) return store.wire[i]!.input as any;
      return undefined;
    },
    routes: () => Object.fromEntries(stores.flatMap((s) => [...(s.client.saveRoutes as Map<string, number>)])),
    close: () => Promise.all(stores.map((s) => s.close())),
  };
}
