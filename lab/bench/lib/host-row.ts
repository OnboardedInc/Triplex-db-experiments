/** [EXP-P5N] Why: the sweep worker thread decodes host rows itself (D3) and must not import host-store.ts (core, effect, the whole runtime) just for this function.
 * Rejected: duplicating it (two decoders would drift).
 */
import type { WorldRow } from "./w0-world.ts";
export function decodeHostRow(r: any): WorldRow {
  const key: any = {
    string: "value_string",
    ref: "value_string",
    integer: "value_string",
    boolean: "value_boolean",
    json: "value_json",
    datetime: "value_datetime",
    number: "value_number",
  };
  let value = r[key[r.value_type]];
  if (r.value_type === "boolean") value = !!value;
  if (r.value_type === "json") value = JSON.parse(value);
  if (!key[r.value_type]) throw Error("unsupported host row value");
  return {
    id: r.id,
    entityId: r.entity_id,
    attribute: r.attribute,
    value: { type: r.value_type, value },
    position: r.recorded_position,
    validFrom: r.valid_from,
    ...(r.valid_to === null ? {} : { validTo: r.valid_to }),
  };
}
