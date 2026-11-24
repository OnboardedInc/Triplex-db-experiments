// [DX-CON1] The guard every console request to a gateway goes through: no read without an entity ID is ever sent.
// A row read (POST /v1/db/{db}/read) passes when it names a fact ID or entity IDs. A read for one of Triplex's five
// configuration entity types is given the entity IDs config.ts discovered from the refs (G1). Any other read with no
// entity ID throws ScanRefused before a request is made. The store's Datalog route (POST /v1/db/{db}/q) is sent only
// inside approvedQuery(), which query.ts enters after its own checks (every pattern names its entity).
// Why: on this engine a read by entity type or attribute enumerates every entity, holds a read permit and has no budget
// (DESIGN.md F3); at 1 billion records that is hours. Rejected: trusting each caller (Triplex's own ConfigStore,
// entityPage and enforcement all send such reads).
import { AsyncLocalStorage } from "node:async_hooks";
import { DatomicClient } from "@triplex-build/triplex-datomic";
import { DemoError } from "./errors.ts";

export const configEntityTypes = [
  "triplex.config-object",
  "triplex.config-type",
  "triplex.config-revision",
  "triplex.config-snapshot",
  "triplex.config-ref",
] as const;
export type ConfigEntityType = (typeof configEntityTypes)[number];
export type ConfigIds = Record<ConfigEntityType, readonly string[]>;

export class ScanRefused extends DemoError {
  constructor(what: string) {
    super(
      "ScanRefused",
      `Refused before sending: ${what}. This engine keeps facts by entity and has no index by attribute, value or entity type, so this read would enumerate every entity of the database. Name the entity.`,
    );
  }
}

const approved = new AsyncLocalStorage<true>();
/** Run work in which the store's Datalog route may be called (query.ts has checked every pattern). */
export const approvedQuery = <T>(work: () => Promise<T>) => approved.run(true, work);

const literal = (v: unknown) => typeof v === "string" && v.length > 0 && !v.startsWith("?");

/** Counts kept for the gates: what the guard let through, rewrote and refused. */
export const guardCounts = { sent: 0, configRewrites: 0, refused: 0, queriesSent: 0 };

export class GuardedClient extends DatomicClient {
  /** The five configuration ID lists, set by config.ts after each discovery; undefined until the first. */
  configIds: ConfigIds | undefined;
  /**
   * [DX-INT3] Called with the position of every commit this client had acknowledged (POST /v1/db/{db}/transact), from
   * any caller: the console's saves, its entity creations and the configuration store's releases alike.
   */
  onAcknowledged: ((db: string, position: number) => void) | undefined;

  override async request<T>(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
    timeoutMs?: number,
    onSent?: (published?: boolean) => void,
  ): Promise<T> {
    if (method === "POST" && /^\/v1\/db\/[^/]+\/read$/.test(path)) {
      const input = (body ?? {}) as Record<string, unknown>;
      const pattern = (input["pattern"] ?? {}) as Record<string, unknown>;
      const ids = input["entityIds"];
      const named = literal(input["id"]) || (Array.isArray(ids) && ids.length > 0) || literal(pattern["entityId"]);
      if (!named) {
        const type = pattern["entityType"];
        if (typeof type === "string" && (configEntityTypes as readonly string[]).includes(type)) {
          if (!this.configIds) {
            guardCounts.refused++;
            throw new ScanRefused(`a read of every ${type} entity before the configuration was discovered from its refs`);
          }
          const known = this.configIds[type as ConfigEntityType];
          guardCounts.configRewrites++;
          if (!known.length) return { rows: [] } as T; // an empty list would mean "no filter" to the gateway
          body = { ...input, entityIds: known };
        } else {
          guardCounts.refused++;
          const what = typeof type === "string" ? `a read of every entity of type ${type}`
            : typeof pattern["attribute"] === "string" ? `a read of every ${pattern["attribute"]} fact`
            : "a read with no entity ID";
          throw new ScanRefused(what);
        }
      }
    }
    if (method === "POST" && /^\/v1\/db\/[^/]+\/q$/.test(path)) {
      if (!approved.getStore()) {
        guardCounts.refused++;
        throw new ScanRefused("a Datalog query sent to the store without the console's checks");
      }
      guardCounts.queriesSent++;
    }
    guardCounts.sent++;
    const answer = await super.request<T>(method, path, body, timeoutMs, onSent);
    const commit = method === "POST" ? /^\/v1\/db\/([^/]+)\/transact$/.exec(path) : null;
    const position = (answer as { position?: { t?: string; v?: unknown } } | null)?.position;
    if (commit && this.onAcknowledged && position?.t === "long") {
      const p = Number(position.v);
      if (Number.isSafeInteger(p) && p >= 0) this.onAcknowledged(commit[1]!, p);
    }
    return answer;
  }
}
