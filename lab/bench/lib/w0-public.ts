import type { Lane, TriplesHandle } from "./triplex.ts";
import {
  BasisNotAvailable,
  requirePosition,
  type PositionBasis,
  type WorldRow,
} from "./w0-world.ts";

export async function publicSweep(
  lane: Lane,
  handle: TriplesHandle,
  feedPage?: (after: number, limit: number) => Promise<{ transactions: readonly any[] }>,
) {
  if (lane === "datomic")
    return (await import("./w0-datomic-reader.ts")).datomicW0Sweep(handle, feedPage);
  if (lane !== "xtdb") return portableSweep(handle);
  const api = await import("../../../packages/xtdb/dist/index.js");
  const client = api.makeXtdbClient(handle.backend.url);
  let requested: PositionBasis | undefined,
    observed = 0;
  // [EXP-P5] Why: wrap the adapter's read statement with a head LEFT JOIN, including empty pages, so future P is checked in the identical statement snapshot. Rejected: currentPosition then read (two snapshots).
  const guarded = {
    ...client,
    query: async (sql: string, params: readonly unknown[] = [], basis?: any, options?: any) => {
      if (!requested) return client.query(sql, params, basis, options);
      const result = await client.query(
        `SELECT p.p5_head, r.* FROM (SELECT COALESCE(MAX(position), 0) AS p5_head FROM tx_meta FOR ALL VALID_TIME WHERE scope_key = ?) p LEFT JOIN (${sql}) r ON TRUE`,
        [handle.scope, ...params],
        basis,
        options,
      );
      observed = Number(result[0]?.p5_head);
      requirePosition(requested, observed);
      return result.filter((r) => r.id != null).map(({ p5_head: _head, ...row }) => row);
    },
  };
  const adapter = api.makeXtdbStorageAdapter(guarded as any, handle.scope as string);
  return {
    page: async (subjects: readonly string[], b: PositionBasis) => {
      // One handle per sweep worker; never share the mutable statement guard concurrently.
      if (requested) throw new Error("concurrent sweep page on one worker handle");
      requirePosition(b, Number.MAX_SAFE_INTEGER);
      requested = b;
      try {
        const seen = new Set(subjects),
          rows: WorldRow[] = [];
        let frontier = [...subjects],
          roundTrips = 0;
        while (frontier.length) {
          const map = await handle.run<ReadonlyMap<string, readonly any[]>>(
            adapter.getByEntities(frontier as any, {
              recordedPosition: b.position,
              validAt: b.validAt,
            }),
          );
          roundTrips++;
          const next: string[] = [];
          for (const body of map.values())
            for (const r of body) {
              const value = decode(r);
              rows.push({
                id: r.id,
                entityId: r.entity_id,
                attribute: r.attribute,
                value,
                position: r.recorded_position,
                validFrom: r.valid_from,
                ...(r.valid_to != null ? { validTo: r.valid_to } : {}),
              });
              if (value.type === "ref" && !seen.has(value.value)) {
                seen.add(value.value);
                next.push(value.value);
              }
            }
          frontier = next;
        }
        return {
          rows,
          reportedBasis: { ...b },
          position: observed,
          epoch: String(handle.scope),
          roundTrips,
        };
      } catch (e: any) {
        if (e?._tag === "BasisNotAvailable" || String(e).includes("explicit available P"))
          throw new BasisNotAvailable("future or unavailable P");
        throw e;
      } finally {
        requested = undefined;
      }
    },
    counts: async () => {
      const r = await client.query(
        "SELECT (SELECT COALESCE(MAX(position), 0) FROM tx_meta FOR ALL VALID_TIME WHERE scope_key = ?) AS position, COUNT(*) AS assertions, COUNT(retracted_position) AS retired FROM tx_assertions FOR ALL VALID_TIME WHERE scope_key = ?",
        [handle.scope, handle.scope],
      );
      return {
        position: Number(r[0]?.position),
        assertions: Number(r[0]?.assertions),
        retired: Number(r[0]?.retired),
      };
    },
    close: () => client.close(),
  };
}
function decode(r: any) {
  const key: Record<string, string> = {
    string: "value_string",
    ref: "value_string",
    integer: "value_string",
    boolean: "value_boolean",
    json: "value_json",
  };
  const raw = r[key[r.value_type]!];
  if (r.value_type === "integer") return { type: "integer", value: String(raw) };
  if (r.value_type === "boolean") return { type: "boolean", value: raw === 1 || raw === true };
  if (r.value_type === "json") return { type: "json", value: JSON.parse(raw) };
  if (!["string", "ref"].includes(r.value_type))
    throw new TypeError("unsupported W0 stored value " + r.value_type);
  return { type: r.value_type, value: raw };
}

// [EXP-W02-R2] Why: the D/Q adapters already expose exact recordedPosition reads through their public StorageAdapter service. Rejected: sending an internal position to Triples.entities, whose public TemporalBasis only accepts instants.
export function portableSweep(
  handle: TriplesHandle,
  feedPage?: (after: number, limit: number) => Promise<{ transactions: readonly any[] }>,
) {
  const storage = handle.storage;
  if (!storage) throw Error("lane does not expose its public storage service");
  return {
    page: async (subjects: readonly string[], basis: PositionBasis) => {
      const head = Number(await handle.run(storage.currentCommitPosition()));
      if (!Number.isSafeInteger(head) || head < 0)
        throw new BasisNotAvailable("invalid source head");
      requirePosition(basis, head);
      const seen = new Set(subjects),
        rows: WorldRow[] = [];
      let frontier = [...subjects],
        roundTrips = 0;
      while (frontier.length) {
        const page = await handle.run<ReadonlyMap<string, readonly any[]>>(
          storage.getByEntities(frontier, {
            recordedPosition: basis.position,
            validAt: basis.validAt,
          }),
        );
        frontier = [];
        roundTrips++;
        for (const body of page.values())
          for (const r of body) {
            if (
              !Number.isSafeInteger(Number(r.recorded_position)) ||
              Number(r.recorded_position) < 1 ||
              Number(r.recorded_position) > basis.position ||
              (r.retracted_position != null && Number(r.retracted_position) <= basis.position)
            )
              throw new BasisNotAvailable("lane returned rows outside requested position");
            const value = decode(r);
            rows.push({
              id: r.id,
              entityId: r.entity_id,
              attribute: r.attribute,
              value,
              position: Number(r.recorded_position),
              validFrom: Number(r.valid_from),
              ...(r.valid_to == null ? {} : { validTo: Number(r.valid_to) }),
            });
            if (value.type === "ref" && !seen.has(value.value)) {
              seen.add(value.value);
              frontier.push(value.value);
            }
          }
      }
      return {
        rows,
        reportedBasis: { ...basis },
        position: head,
        epoch: String(handle.scope),
        roundTrips,
      };
    },
    counts: async () => {
      const position = Number(await handle.run(storage.currentCommitPosition()));
      const entities = new Set<string>();
      let after = 0;
      // [DX-H2] Why: bounded Datomic feed responses fit its transport budget; still enumerate the entire journal.
      // Rejected: accepting a partial feed or increasing the read timeout in a package.
      while (after < position) {
        const page: any = feedPage
          ? await feedPage(after, 1000)
          : await handle.run(
              handle.triples.transactions({
                after,
                limit: handle.backend.name === "datomic" ? 100 : 1000,
              }),
            );
        const txs = page.transactions.filter((t: any) => t.position <= position);
        if (!txs.length) throw Error("store count enumeration has a feed gap");
        for (const tx of txs) for (const c of tx.changes) entities.add(c.entityId);
        const next = txs.at(-1).position;
        if (next <= after) throw Error("nonprogressing count feed");
        after = next;
      }
      let assertions = 0,
        retired = 0;
      // [DX-H2] Why: history enumeration checks every entity, with bounded parallelism so untimed G9 setup does not dominate seeding.
      // Rejected: counting only live rows or dropping retired entities (weakens the count gate).
      const entityList = [...entities];
      for (let offset = 0; offset < entityList.length; offset += 8) {
        const histories = await Promise.all(
          entityList
            .slice(offset, offset + 8)
            .map((entity) => handle.run<readonly any[]>(storage.history(entity))),
        );
        for (const history of histories) {
          if (history.some((r) => Number(r.recorded_position) > position))
            throw Error("history escaped count snapshot");
          assertions += history.length;
          retired += history.filter((r) => r.retracted_position != null).length;
        }
      }
      if (Number(await handle.run(storage.currentCommitPosition())) !== position)
        throw Error("store changed during count enumeration");
      return { position, assertions, retired };
    },
    close: async () => {},
  };
}

// [DX-H2] Why: a trace command replaces root scalars, not its reachable answer/document graph.
// Rejected: portableSweep for this precondition read (growing ballast made the no-sweep queue miss its lease).
export async function rootAttributeRows(
  handle: TriplesHandle,
  subject: string,
  attributes: readonly string[],
  basis: PositionBasis,
): Promise<WorldRow[]> {
  const storage = handle.storage;
  if (!storage) throw Error("missing public storage service");
  const head = Number(await handle.run(storage.currentCommitPosition()));
  if (!Number.isSafeInteger(head) || head < 0) throw new BasisNotAvailable("invalid source head");
  requirePosition(basis, head);
  const pages = await Promise.all(
    [...new Set(attributes)].map((attribute) =>
      handle.run<readonly any[]>(
        storage.query(
          { entityId: subject, attribute },
          { recordedPosition: basis.position, validAt: basis.validAt },
        ),
      ),
    ),
  );
  return pages.flat().map((r) => {
    if (
      r.entity_id !== subject ||
      !attributes.includes(r.attribute) ||
      !Number.isSafeInteger(Number(r.recorded_position)) ||
      Number(r.recorded_position) < 1 ||
      Number(r.recorded_position) > basis.position ||
      (r.retracted_position != null && Number(r.retracted_position) <= basis.position) ||
      Number(r.valid_from) > basis.validAt ||
      (r.valid_to != null && Number(r.valid_to) <= basis.validAt)
    )
      throw new BasisNotAvailable("root attribute read escaped requested cut");
    return {
      id: r.id,
      entityId: r.entity_id,
      attribute: r.attribute,
      value: decode(r),
      position: Number(r.recorded_position),
      validFrom: Number(r.valid_from),
      ...(r.valid_to == null ? {} : { validTo: Number(r.valid_to) }),
    };
  });
}
