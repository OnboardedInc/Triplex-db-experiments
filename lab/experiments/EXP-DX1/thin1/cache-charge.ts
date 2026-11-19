import assert from "node:assert/strict";
import fs from "node:fs";

type Field = { name: string; type: number };
type ClassInfo = { parent: number; fields: Field[] };
type Item = { id: number; name: string; fields: Record<string, number> };

// [DX-THIN1] Why: Datomic reports object-cache requests and hits; its real byte budget is charged by a scaled Caffeine weigher.
// Rejected: the JVM RSS delta or the configured maximum as measured occupancy. Field layouts follow OpenJDK's HPROF heapDumper.cpp.
export function cacheCharge(file: string, configured: number, allowUnopened = false) {
  const fd = fs.openSync(file, "r"),
    length = fs.fstatSync(fd).size,
    buf = Buffer.allocUnsafe(1 << 20);
  let at = 0,
    start = -1,
    valid = 0,
    idSize = 0;
  const bytes = (n: number) => {
    assert(at + n <= length && n <= buf.length, "Truncated heap observation");
    if (at < start || at + n > start + valid) {
      start = at;
      valid = fs.readSync(fd, buf, 0, buf.length, at);
      assert(valid >= n);
    }
    const offset = at - start;
    at += n;
    return offset;
  };
  const u1 = () => buf.readUInt8(bytes(1)),
    u2 = () => buf.readUInt16BE(bytes(2)),
    u4 = () => buf.readUInt32BE(bytes(4));
  const id = () => {
    const n = idSize === 4 ? u4() : Number(buf.readBigUInt64BE(bytes(8)));
    assert(Number.isSafeInteger(n));
    return n;
  };
  const sizes = [0, 0, 0, 0, 1, 2, 4, 8, 1, 2, 4, 8];
  const width = (type: number) => {
    const n = type === 2 ? idSize : sizes[type];
    assert(n);
    return n;
  };
  const strings = new Map<number, string>(),
    names = new Map<number, number>(),
    classes = new Map<number, ClassInfo>();
  const layouts = new Map<number, Field[]>(),
    items = new Map<number, Item>();
  const wantedFields = new Set([
    "weigher",
    "delegate",
    "f",
    "divisor",
    "value",
    "weightedSize",
    "maximum",
  ]);
  const layout = (k: number): Field[] => {
    const cached = layouts.get(k);
    if (cached) return cached;
    const c = classes.get(k);
    assert(c, "Missing HPROF class layout");
    const fields = c.fields.concat(c.parent === 0 ? [] : layout(c.parent));
    layouts.set(k, fields);
    return fields;
  };
  const fieldValue = (t: number) =>
    t === 2
      ? id()
      : t === 11
        ? Number(buf.readBigInt64BE(bytes(8)))
        : t === 10
          ? buf.readInt32BE(bytes(4))
          : ((at += width(t)), 0);
  function subrecord(tag: number) {
    if (tag === 0x20) {
      const k = id();
      at += 4;
      const parent = id();
      at += 5 * idSize + 4;
      for (let n = u2(); n > 0; n--) {
        at += 2;
        const t = u1();
        at += width(t);
      }
      for (let n = u2(); n > 0; n--) {
        at += idSize;
        const t = u1();
        at += width(t);
      }
      const fields: Field[] = [];
      for (let n = u2(); n > 0; n--) {
        const name = strings.get(id());
        assert(name !== undefined);
        fields.push({ name, type: u1() });
      }
      classes.set(k, { parent, fields });
      return;
    }
    if (tag === 0x21) {
      const obj = id();
      at += 4;
      const k = id(),
        size = u4(),
        end = at + size;
      const name = strings.get(names.get(k)!)?.replaceAll("/", ".");
      assert(name !== undefined, "Unnamed class");
      const caffeine =
        name.includes("caffeine.cache.") &&
        !name.includes("Node") &&
        /(?:\.S[SI][A-Z]*$|\.P[SI][A-Z]*$|Weigher)/.test(name);
      const datomic =
        name.startsWith("datomic.cache.caffeine$create_") ||
        name.startsWith("datomic.domain$create_object_cache$fn");
      const boxed = name === "java.lang.Long" || name === "java.lang.Integer";
      if (caffeine || datomic || boxed) {
        const fields: Record<string, number> = {};
        for (const f of layout(k)) {
          if (wantedFields.has(f.name)) fields[f.name] = fieldValue(f.type);
          else at += width(f.type);
        }
        assert.equal(at, end, "HPROF instance size differs from layout");
        if (!boxed || fields.value === 1000) items.set(obj, { id: obj, name, fields });
      }
      at = end;
      return;
    }
    if (tag === 0x22) {
      at += idSize + 4;
      const count = u4();
      at += idSize + count * idSize;
      return;
    }
    if (tag === 0x23) {
      at += idSize + 4;
      const count = u4(),
        t = u1();
      at += count * width(t);
      return;
    }
    const rootBytes: Record<number, number> = {
      1: idSize * 2,
      2: idSize + 8,
      3: idSize + 8,
      4: idSize + 4,
      5: idSize,
      6: idSize + 4,
      7: idSize,
      8: idSize + 8,
      255: idSize,
    };
    const n = rootBytes[tag];
    assert(n, "Unknown HPROF subrecord " + tag);
    at += n;
  }
  try {
    let header = "";
    while (!header.endsWith("\0") && at < 40) header += String.fromCharCode(u1());
    assert(header.startsWith("JAVA PROFILE 1.0."));
    idSize = u4();
    assert(idSize === 4 || idSize === 8);
    at += 8;
    let segmentEnd = false;
    while (at < length) {
      const tag = u1();
      at += 4;
      const size = u4(),
        end = at + size;
      assert(end <= length);
      if (tag === 1) {
        const k = id(),
          n = size - idSize;
        if (n < 16384) {
          const offset = bytes(n);
          strings.set(k, buf.toString("utf8", offset, offset + n));
        }
      } else if (tag === 2) {
        at += 4;
        const k = id();
        at += 4;
        names.set(k, id());
      } else if (tag === 0x0c || tag === 0x1c) {
        while (at < end) subrecord(u1());
        assert.equal(at, end);
      } else if (tag === 0x2c) segmentEnd = true;
      at = end;
    }
    assert(segmentEnd, "Incomplete segmented HPROF observation");
    const caches = [];
    for (const cache of items.values()) {
      if (cache.fields.weightedSize === undefined || cache.fields.maximum === undefined) continue;
      let w = items.get(cache.fields.weigher);
      if (w?.name.includes("Weigher") && w.fields.delegate) w = items.get(w.fields.delegate);
      const scaled = items.get(w?.fields.f ?? 0),
        domain = items.get(scaled?.fields.f ?? 0),
        divisor = items.get(scaled?.fields.divisor ?? 0);
      if (!domain?.name.startsWith("datomic.domain$create_object_cache$fn")) continue;
      assert(scaled && divisor && w);
      assert(
        scaled.name.includes("create_scaled_weight_limited") &&
          divisor.fields.value === 1000 &&
          w.name.includes("create_weight_limited"),
      );
      const units = cache.fields.weightedSize,
        maxUnits = cache.fields.maximum;
      assert(
        Number.isSafeInteger(units) &&
          units >= 0 &&
          Number.isSafeInteger(maxUnits) &&
          maxUnits > 0 &&
          maxUnits <= Math.ceil(configured / 1000),
      );
      caches.push({
        class: cache.name,
        units,
        maxUnits,
        bytesPerUnit: divisor.fields.value,
        weigher: [w.name, scaled.name, domain.name],
      });
    }
    const domainWeighers = [...items.values()].filter(x => x.name.startsWith("datomic.domain$create_object_cache$fn")).length;
    assert(
      caches.length > 0 || (allowUnopened && domainWeighers === 0),
      "Expected a live Datomic object cache; matched " +
        caches.length +
        " candidates " +
        JSON.stringify(
          [...items.values()]
            .filter((x) => x.fields.maximum !== undefined)
            .map((x) => ({
              c: x.name,
              w: items.get(x.fields.weigher)?.name,
              maximum: x.fields.maximum,
              weight: x.fields.weightedSize,
            })),
        ).slice(0, 2000),
    );
    return {
      chargedBytes: caches.reduce((total, c) => total + c.units * c.bytesPerUnit, 0),
      caches,
      domainWeighers,
      hprofBytes: length,
    };
  } finally {
    fs.closeSync(fd);
  }
}
