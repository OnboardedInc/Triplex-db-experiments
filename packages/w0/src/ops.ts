/**
 * The six operations over wire inputs (SPEC 1, 4.3, 4.4 step 1): bytes in, canonical JSON out.
 *
 * Step 1 (`W0.E_SHAPE`) is checked here, over the scanned value, for the whole input before any later step. The typed entry
 * points in `kernel.ts`, `affected.ts` and `outbox.ts` then run steps 2 onwards.
 */
import { affectedSubjects } from "./affected.js";
import type { JV } from "./json.js";
import { JsonSyntaxError, canonicalJV, decodeUtf8Strict, quote, scan } from "./json.js";
import type { Basis, Fact, World } from "./kernel.js";
import { evaluateWorld, reconcileWorld, resultJson } from "./kernel.js";
import type {
  Delivery,
  EvaluationRecord,
  ItemState,
  OutboxState,
  ReceiverState,
  RecordWorkItem,
} from "./outbox.js";
import { publish, publishJson, receive, receiveJson } from "./outbox.js";
import type { Activation } from "./release.js";
import { RELEASES_BY_NAME } from "./release.js";
import type { RawValue } from "./schema.js";
import { NOT_A_VALUE } from "./schema.js";

export type Op = "evaluate" | "reconcile" | "affected" | "publish" | "receive";
export const OPS: readonly Op[] = ["evaluate", "reconcile", "affected", "publish", "receive"];

class ShapeError extends Error {}
const shape = (): never => {
  throw new ShapeError("W0.E_SHAPE");
};

/** An object with exactly the listed keys (SPEC 4.4 step 1); returns its members. */
function obj(x: JV | undefined, keys: readonly string[]): Map<string, JV> {
  if (x === undefined || x.t !== "obj" || x.m.size !== keys.length) return shape();
  for (const k of keys) if (!x.m.has(k)) shape();
  return x.m;
}
const member = (m: Map<string, JV>, k: string): JV => m.get(k)!;
const str = (x: JV): string => (x.t === "str" ? x.v : shape());
/** a JSON integer token (SPEC 2): `3.0` and `1e1` are not (cases C45, C71, C72) */
const int = (x: JV): bigint => (x.t === "int" ? x.v : shape());
const arr = (x: JV): JV[] => (x.t === "arr" ? x.v : shape());
const bool = (x: JV): boolean => (x.t === "bool" ? x.v : shape());
const payloadObj = (x: JV): string => (x.t === "obj" ? canonicalJV(x) : shape());

const MAX = 9007199254740991n;
/**
 * A position for the typed layer. Every check on a position is a range check (`basis.tx` 0 to 2^53 - 1, a fact's or an
 * activation's `tx` 1 to basis.tx), and an integer outside the safe range fails each of them, so it maps to -1, which fails
 * them the same way.
 */
const position = (t: bigint): number => (t >= 0n && t <= MAX ? Number(t) : -1);

/**
 * A fact value for the typed layer. A JSON value that no W0 type accepts (null, an array, a non-integer number token, an object
 * that is not one `erasedAt` string member) is W0.E_VALUE on any attribute, so it maps to NOT_A_VALUE; an integer token stays
 * an exact bigint (SPEC 2, 14 rows 1 and 2).
 */
function rawValue(x: JV): RawValue {
  switch (x.t) {
    case "str":
      return x.v;
    case "bool":
      return x.v;
    case "int":
      return x.v;
    case "obj": {
      const at = x.m.get("erasedAt");
      return x.m.size === 1 && at !== undefined && at.t === "str"
        ? { erasedAt: at.v }
        : NOT_A_VALUE;
    }
    default:
      return NOT_A_VALUE;
  }
}

function basisOf(x: JV): Basis {
  const m = obj(x, ["tx", "validTime"]);
  return { tx: position(int(member(m, "tx"))), validTime: str(member(m, "validTime")) };
}

function worldOf(x: JV): World {
  const m = obj(x, ["facts", "subject"]);
  const subject = str(member(m, "subject"));
  const facts: Fact[] = arr(member(m, "facts")).map((f) => {
    const fm = obj(f, ["a", "e", "tx", "v"]);
    // SPEC 4.4 step 1: a fact's `v` may be any JSON kind here; its type is checked in step 3.
    return {
      e: str(member(fm, "e")),
      a: str(member(fm, "a")),
      v: rawValue(member(fm, "v")),
      tx: position(int(member(fm, "tx"))),
    };
  });
  return { subject, facts };
}

function releaseOf(x: JV) {
  // SPEC 4.4 step 1: a `release` name other than R1, R2 or R3 is W0.E_SHAPE.
  const r = RELEASES_BY_NAME.get(str(x));
  return r === undefined ? shape() : r;
}

// ---- publish and receive shapes (SPEC 4.4 step 1, RULINGS Q44a) ----

function recordBasisOf(x: JV) {
  const m = obj(x, ["tx", "validTime"]);
  return { tx: int(member(m, "tx")), validTime: str(member(m, "validTime")) };
}

function seqOf(x: JV, min: bigint): bigint {
  const s = int(x);
  return s >= min ? s : shape(); // `seq` at least 1 (case C85), `done` at least 0
}

function deliveryOf(x: JV): Delivery {
  const m = obj(x, ["id", "key", "kind", "payload", "rule", "seq", "subject", "version"]);
  return {
    id: str(member(m, "id")),
    key: str(member(m, "key")),
    kind: str(member(m, "kind")),
    payload: payloadObj(member(m, "payload")),
    rule: str(member(m, "rule")),
    seq: seqOf(member(m, "seq"), 1n),
    subject: str(member(m, "subject")),
    version: str(member(m, "version")),
  };
}

function recordOf(x: JV): EvaluationRecord {
  const m = obj(x, ["basis", "release", "subject", "workItems"]);
  const workItems: RecordWorkItem[] = arr(member(m, "workItems")).map((w) => {
    const wm = obj(w, ["id", "inputs", "key", "kind", "payload", "rule", "version"]);
    arr(member(wm, "inputs")).forEach(int);
    return {
      id: str(member(wm, "id")),
      key: str(member(wm, "key")),
      kind: str(member(wm, "kind")),
      payload: payloadObj(member(wm, "payload")),
      rule: str(member(wm, "rule")),
      version: str(member(wm, "version")),
    };
  });
  return {
    basis: recordBasisOf(member(m, "basis")),
    release: str(member(m, "release")),
    subject: str(member(m, "subject")),
    workItems,
  };
}

function outboxStateOf(x: JV): OutboxState {
  const m = obj(x, ["items", "pending", "subjects"]);
  const items: ItemState[] = arr(member(m, "items")).map((i) => {
    const im = obj(i, ["id", "payload", "retired", "seq", "subject"]);
    return {
      id: str(member(im, "id")),
      payload: payloadObj(member(im, "payload")),
      retired: bool(member(im, "retired")),
      seq: seqOf(member(im, "seq"), 1n),
      subject: str(member(im, "subject")),
    };
  });
  const pending = arr(member(m, "pending")).map(deliveryOf);
  const subjects = arr(member(m, "subjects")).map((s) => {
    const sm = obj(s, ["basis", "subject"]);
    return { basis: recordBasisOf(member(sm, "basis")), subject: str(member(sm, "subject")) };
  });
  return { items, pending, subjects };
}

function receiverStateOf(x: JV): ReceiverState {
  const m = obj(x, ["effects", "projection"]);
  const effects = arr(member(m, "effects")).map((e) => {
    const em = obj(e, ["done", "id", "waiting"]);
    return {
      done: seqOf(member(em, "done"), 0n),
      id: str(member(em, "id")),
      waiting: arr(member(em, "waiting")).map(deliveryOf),
    };
  });
  const projection = arr(member(m, "projection")).map((p) => {
    const pm = obj(p, ["id", "payload", "seq"]);
    return {
      id: str(member(pm, "id")),
      payload: payloadObj(member(pm, "payload")),
      seq: seqOf(member(pm, "seq"), 1n),
    };
  });
  return { effects, projection };
}

const errorJson = (code: string): string => '{"error":' + quote(code) + "}";

/**
 * Runs `op` on a scanned input and returns the canonical JSON of its result (SPEC 9, 11.1). A duplicate key anywhere in the
 * input is W0.E_SHAPE (SPEC 4.4 step 1, case C66), as is any departure from the SPEC 4.3 and 4.4 step 1 shapes.
 */
export function runOpJV(op: Op, input: JV): string {
  try {
    if (input.t !== "obj" || input.dup) return shape();
    switch (op) {
      case "evaluate": {
        const m = obj(input, ["basis", "release", "world"]);
        const basis = basisOf(member(m, "basis"));
        const rel = releaseOf(member(m, "release"));
        const world = worldOf(member(m, "world"));
        return resultJson(evaluateWorld(world, rel, basis));
      }
      case "reconcile": {
        const m = obj(input, ["activations", "basis", "world"]);
        const activations: Activation[] = arr(member(m, "activations")).map((a) => {
          const am = obj(a, ["from", "release", "tx"]);
          return {
            from: str(member(am, "from")),
            release: str(member(am, "release")),
            tx: position(int(member(am, "tx"))),
          };
        });
        const basis = basisOf(member(m, "basis"));
        const world = worldOf(member(m, "world"));
        return resultJson(reconcileWorld(world, activations, basis));
      }
      case "affected": {
        const m = obj(input, ["basis", "release", "worlds", "writes"]);
        const basis = basisOf(member(m, "basis"));
        const rel = releaseOf(member(m, "release"));
        const worlds = arr(member(m, "worlds")).map(worldOf);
        // SPEC 4.4 step 1: two worlds with the same subject are W0.E_SHAPE (case C67).
        if (new Set(worlds.map((w) => w.subject)).size !== worlds.length) shape();
        const writes = arr(member(m, "writes")).map((w) => {
          const pair = arr(w);
          if (pair.length !== 2) shape();
          return [str(pair[0]!), str(pair[1]!)] as const;
        });
        const r = affectedSubjects(rel, worlds, writes, basis);
        return "error" in r
          ? errorJson(r.error)
          : '{"affected":[' + r.affected.map(quote).join(",") + "]}";
      }
      case "publish": {
        // SPEC 4.4 step 1: publish runs no step after step 1 (RULINGS Q44a).
        const m = obj(input, ["evaluations", "state"]);
        const records = arr(member(m, "evaluations")).map(recordOf);
        const state = outboxStateOf(member(m, "state"));
        return publishJson(publish(state, records));
      }
      case "receive": {
        const m = obj(input, ["deliveries", "state"]);
        const deliveries = arr(member(m, "deliveries")).map(deliveryOf);
        const state = receiverStateOf(member(m, "state"));
        return receiveJson(receive(state, deliveries));
      }
    }
  } catch (e) {
    if (e instanceof ShapeError) return errorJson("W0.E_SHAPE");
    throw e;
  }
}

/**
 * Runs `op` on input bytes. Bytes that are not one JSON value (a syntax error, not UTF-8, a byte order mark) are W0.E_SHAPE
 * (Q53 reading A01).
 */
export function runOpBytes(op: Op, bytes: Uint8Array): string {
  const text = decodeUtf8Strict(bytes);
  if (text === null) return errorJson("W0.E_SHAPE");
  let input: JV;
  try {
    input = scan(text);
  } catch (e) {
    if (e instanceof JsonSyntaxError) return errorJson("W0.E_SHAPE");
    throw e;
  }
  return runOpJV(op, input);
}
