import {
  decodeValueColumns,
  decodedPrimitiveValue,
  storedValueDomain,
  ValueDomains,
} from "@triplex-build/triplex/runtime";
import { DatomicClient } from "./DatomicClient.js";
import { decodeRowText } from "./rowText.js";
import type { ReachWire } from "./reach.js";
import type { ResolvedTemporalBasis, TripleValue } from "@triplex-build/triplex";

const stringColumns = [1, 2, 3, 4, 5, 9, 13, 14, 16];
const numericColumns = [6, 7, 8, 10, 11, 12, 15];

export interface SweepRow {
  id: string;
  entityId: string;
  attribute: string;
  value: TripleValue;
  position: number;
  validFrom: number;
  validTo?: number;
}
// [DX-H6] Why: sweep inputs live for one page; entity Triples, freezing and revision caches have no reuse.
// Rejected: modifying getReachRowsMany (other consumers need its cache and reference-repair contract).
export function decodeSweepRows(
  response: ReachWire,
  roots: readonly string[],
  basis: ResolvedTemporalBasis,
): SweepRow[] | undefined {
  if (
    !Number.isSafeInteger(basis.recordedPosition) ||
    basis.recordedPosition! < 0 ||
    !Number.isFinite(basis.validAt) ||
    roots.length < 1 ||
    roots.length > 64 ||
    new Set(roots).size !== roots.length ||
    roots.some((root) => typeof root !== "string")
  )
    throw new TypeError("Sweep requires distinct roots and an explicit position/valid-time basis");
  if (response.declined !== undefined) return undefined;
  if (
    !Number.isSafeInteger(response.position) ||
    response.position < 0 ||
    !/^\d+$/.test(response.t) ||
    basis.recordedPosition !== response.position ||
    typeof response.reset !== "boolean" ||
    !Array.isArray(response.entities) ||
    !Array.isArray(response.closures) ||
    response.closures.length !== roots.length
  )
    throw new TypeError("Sweep response basis/shape mismatch");
  const entities = new Set<string>(),
    result: SweepRow[] = [];
  const columns = {
    value_type: "",
    value_string: null as any,
    value_number: null as any,
    value_boolean: null as any,
    value_datetime: null as any,
    value_json: null as any,
  };
  for (const entry of response.entities) {
    if (
      !Array.isArray(entry) ||
      entry.length !== 3 ||
      typeof entry[0] !== "string" ||
      !Number.isSafeInteger(entry[1]) ||
      entry[1] < 0 ||
      !Array.isArray(entry[2]) ||
      entities.has(entry[0])
    )
      throw new TypeError("Sweep requires complete inline entities");
    const [id, rev, wire] = entry;
    if (wire.length === 0 && rev !== 0) throw new TypeError("Invalid empty sweep revision");
    const ids = wire.length > 16 ? new Set<string>() : ([] as string[]);
    entities.add(id);
    for (const values of wire) {
      // [DX-H6] Why: fixed columns validate once; one reusable value-column view avoids a physical-row object per fact.
      // Rejected: dropping validation of unused columns or changing the legacy text decoder.
      let rowId: string,
        entity: string,
        attribute: string,
        position: number,
        recordedAt: number,
        from: number,
        to: number | null,
        value: TripleValue;
      if (typeof values === "string") {
        const r = decodeRowText(values);
        rowId = r.id;
        entity = r.entity_id;
        attribute = r.attribute;
        position = r.recorded_position;
        recordedAt = r.recorded_at;
        from = r.valid_from;
        to = r.valid_to;
        value = decodeValueColumns(r, storedValueDomain(ValueDomains.datomic, attribute));
      } else {
        if (
          !Array.isArray(values) ||
          values.length !== 17 ||
          typeof values[0] !== "string" ||
          !/^\d{16}$/.test(values[0])
        )
          throw new TypeError("Invalid sweep row columns/position");
        // [DX-H6] Why: 99.98% of recorded rows have this fully checked primitive layout; avoid dynamic column-index loops.
        // Rejected: assuming common null/metadata fields without checking each one.
        const common =
          typeof values[5] === "string" &&
          values[6] === null &&
          values[7] === null &&
          values[8] === null &&
          values[9] === null &&
          values[12] === null &&
          typeof values[13] === "string" &&
          values[14] === null &&
          typeof values[16] === "string" &&
          typeof values[10] === "number" &&
          Number.isFinite(values[10]) &&
          typeof values[11] === "number" &&
          Number.isFinite(values[11]) &&
          Number.isSafeInteger(values[15]);
        if (!common) {
          for (const i of stringColumns)
            if (values[i] !== null && typeof values[i] !== "string")
              throw new TypeError("Invalid sweep string column");
          for (const i of numericColumns)
            if (
              values[i] !== null &&
              values[i] !== "-0" &&
              (typeof values[i] !== "number" || !Number.isFinite(values[i]))
            )
              throw new TypeError("Invalid sweep numeric column");
        }
        position = Number(values[0]);
        const schema = values[15] === "-0" ? -0 : values[15];
        if (
          !Number.isSafeInteger(position) ||
          !Number.isSafeInteger(schema) ||
          typeof values[1] !== "string" ||
          typeof values[2] !== "string" ||
          typeof values[3] !== "string" ||
          typeof values[4] !== "string" ||
          values[10] === null ||
          values[11] === null
        )
          throw new TypeError("Missing/unsafe sweep row field");
        rowId = values[1];
        entity = values[2];
        attribute = values[3];
        recordedAt = values[10] === "-0" ? -0 : values[10];
        from = values[11] === "-0" ? -0 : values[11];
        to = values[12] === "-0" ? -0 : values[12];
        if (attribute === ":_tx/position" && values[6] !== null)
          throw new TypeError("Journal position payload must be null");
        const type = values[4],
          domain = storedValueDomain(ValueDomains.datomic, attribute);
        // [DX-H6] Why: the public primitive decoder performs the identical domain checks without allocating two value objects.
        // Rejected: a W0-only unchecked string/ref shortcut.
        if (type === "string" || type === "ref" || type === "integer")
          value = decodedPrimitiveValue(type, values[5], domain);
        else if (type === "boolean")
          value = decodedPrimitiveValue(
            type,
            values[7] === 0 || values[7] === "-0" ? false : values[7] === 1 ? true : undefined,
            domain,
          );
        else if (type === "datetime")
          value = decodedPrimitiveValue(type, values[8] === "-0" ? -0 : values[8], domain);
        else if (type === "number") {
          let n = values[6] === "-0" ? -0 : values[6];
          if (attribute === ":_tx/position") {
            if (n !== null) throw new TypeError("Journal position payload must be null");
            n = position;
          }
          value = decodedPrimitiveValue(type, n, domain);
        } else {
          if (attribute === ":_tx/position" && values[6] !== null)
            throw new TypeError("Journal position payload must be null");
          columns.value_type = type;
          columns.value_string = values[5];
          columns.value_number = values[6] === "-0" ? -0 : values[6];
          columns.value_boolean = values[7] === "-0" ? -0 : values[7];
          columns.value_datetime = values[8] === "-0" ? -0 : values[8];
          columns.value_json = values[9];
          value = decodeValueColumns(columns, domain);
        }
      }
      if (
        entity !== id ||
        (ids instanceof Set ? ids.has(rowId) : ids.includes(rowId)) ||
        position < 1 ||
        position > response.position ||
        !Number.isFinite(recordedAt)
      )
        throw new TypeError("Sweep row binding/position mismatch");
      if (ids instanceof Set) ids.add(rowId);
      else ids.push(rowId);
      if (from <= basis.validAt && (to === null || to > basis.validAt)) {
        const row: SweepRow = {
          id: rowId,
          entityId: entity,
          attribute,
          value,
          position,
          validFrom: from,
        };
        if (to !== null) row.validTo = to;
        result.push(row);
      }
    }
  }
  response.closures.forEach(([root, ids], i) => {
    if (
      root !== roots[i] ||
      !Array.isArray(ids) ||
      !ids.includes(root) ||
      new Set(ids).size !== ids.length ||
      ids.some((id) => typeof id !== "string" || !entities.has(id))
    )
      throw new TypeError("Sweep closure binding mismatch");
  });
  // [DX-H6] Why: the kernel consumes a canonical fact set, not SDK BFS order. Return each visible inline row once.
  // Rejected: sorting each entity and then rebuilding/traversing the same graph before worldOf sorts its facts anyway.
  // Full reference coverage still checks every visible ref, including empty referenced entities.
  for (const row of result)
    if (row.value.type === "ref" && !entities.has(row.value.value))
      throw new TypeError("Sweep reference coverage mismatch");
  return result;
}
export async function sweepRows(
  client: DatomicClient,
  db: string,
  roots: readonly string[],
  basis: ResolvedTemporalBasis,
) {
  // [DX-H6] Why: full:true forbids cross-page cache references, so there is no revision repair or retained cache.
  // Rejected: accepting missing references as empty entities.
  const response = await client.request<ReachWire>("POST", `/v2/db/${db}/reach-many`, {
    roots,
    basis,
    rowPage: true,
    full: true,
  });
  return decodeSweepRows(response, roots, basis);
}
