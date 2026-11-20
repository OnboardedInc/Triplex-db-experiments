import { pageAddress } from "./w0-page-outbox.ts";
import { parseOutbox } from "./w0-outbox-state.ts";
import type { WorldRow } from "./w0-world.ts";

// [DX-ACT1] Why: the verifier derives membership from durable masks and checks the body at the same cut. Rejected: asking the publisher to reconstruct its own expected answer.
export function pageWireState(rows: readonly WorldRow[], subject: string) {
  const address = pageAddress(subject);
  const markers = rows.filter((r) => r.entityId === address.page),
    bodies = rows.filter((r) => r.entityId === address.body);
  if (markers.length > 1 || bodies.length > 1) throw Error("Ambiguous durable page state");
  const marker = markers[0],
    body = bodies[0];
  let basis;
  if (marker) {
    if (marker.attribute !== "p5/page-cut" || marker.value.type !== "string")
      throw Error("Wrong page fact");
    const page = parseOutbox(marker.value.value);
    if (page.version !== 1 || page.key !== address.key) throw Error("Wrong page address");
    let seen = 0n;
    for (const band of page.bands) {
      const m = BigInt("0x" + band.bits);
      if (m <= 0n || m >> 256n || m & seen) throw Error("Invalid coverage mask");
      seen |= m;
      if (m & address.bit) basis = band.basis;
    }
    if (!!(BigInt("0x" + page.bodies) & address.bit) !== !!body)
      throw Error("Body presence differs from fence");
  }
  if (body && (!basis || body.attribute !== "p5/page-body" || body.value.type !== "string"))
    throw Error("Unfenced page body");
  const state = body ? parseOutbox(body.value.value) : { items: [], pending: [] };
  const wire = (item: any) => {
    if (item.subject !== subject) throw Error("Incorrect item owner");
    return { ...item, payload: JSON.parse(item.payload) };
  };
  return {
    items: state.items.map(wire),
    pending: state.pending.map(wire),
    subjects: basis ? [{ subject, basis }] : [],
  };
}
