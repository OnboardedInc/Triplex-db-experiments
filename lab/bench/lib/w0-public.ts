import type { Lane, TriplesHandle } from "./triplex.ts";
import {
  BasisNotAvailable,
  requirePosition,
  type PositionBasis,
  type WorldRow,
} from "./w0-world.ts";

export async function publicSweep(lane: Lane, handle: TriplesHandle) {
  if (lane !== "xtdb")
    return {
      page: async (): Promise<never> => {
        throw new BasisNotAvailable("round A qualifies XTDB only");
      },
      counts: async (): Promise<never> => {
        throw new Error("unqualified store counts");
      },
      close: async () => {},
    };
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
        return { rows, position: observed, epoch: String(handle.scope), roundTrips };
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
