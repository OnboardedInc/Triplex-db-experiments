// [EXP-P2X2] Why: F3 must prove one socket write, including extended-protocol parameter bytes.
// Rejected: Promise.all(postgres queries) (the driver's 1KiB flush splits a command).
import net from "node:net";
const i32 = (n) => {
  const b = Buffer.alloc(4);
  b.writeInt32BE(n);
  return b;
};
const i16 = (n) => {
  const b = Buffer.alloc(2);
  b.writeInt16BE(n);
  return b;
};
const z = (s) => Buffer.from(`${s}\0`);
const msg = (type, ...parts) => {
  const body = Buffer.concat(parts);
  return Buffer.concat([Buffer.from(type), i32(body.length + 4), body]);
};
export function encode({ sql, params = [] }) {
  if (!params.length) return msg("Q", z(sql));
  const parse = msg("P", z(""), z(sql), i16(params.length), ...params.map((p) => i32(p.type)));
  const bind = msg(
    "B",
    z(""),
    z(""),
    i16(0),
    i16(params.length),
    ...params.flatMap((p) => {
      const v = Buffer.from(String(p.value));
      return [i32(v.length), v];
    }),
    i16(0),
  );
  return Buffer.concat([
    parse,
    bind,
    msg("D", Buffer.from("P"), z("")),
    msg("E", z(""), i32(0)),
    msg("S"),
  ]);
}
export const text = (value) => ({ type: 25, value });
export const int = (value) => ({ type: 20, value });
export class Wire {
  static async connect(url) {
    const u = new URL(url),
      w = new Wire();
    w.socket = net.createConnection({ host: u.hostname, port: Number(u.port) });
    w.socket.setNoDelay(true);
    w.buffer = Buffer.alloc(0);
    w.pending = [];
    w.writes = 0;
    w.socket.on("data", (b) => w.receive(b));
    w.socket.on("error", (e) => w.rejectAll(e));
    w.socket.on("close", () => w.rejectAll(new Error("connection closed")));
    w.socket.setTimeout(120000, () => w.socket.destroy(new Error("wire timeout")));
    await new Promise((resolve, reject) => {
      w.socket.once("connect", resolve);
      w.socket.once("error", reject);
    });
    const ready = w.next();
    const body = Buffer.concat([
      i32(196608),
      z("user"),
      z(decodeURIComponent(u.username)),
      z("database"),
      z(u.pathname.slice(1)),
      Buffer.from([0]),
    ]);
    w.socket.write(Buffer.concat([i32(body.length + 4), body]));
    await ready;
    return w;
  }
  next() {
    return new Promise((resolve, reject) =>
      this.pending.push({ resolve, reject, rows: [], fields: [], commands: [], error: null }),
    );
  }
  rejectAll(e) {
    for (const p of this.pending.splice(0)) p.reject(e);
  }
  receive(b) {
    this.buffer = Buffer.concat([this.buffer, b]);
    while (this.buffer.length >= 5) {
      const n = this.buffer.readInt32BE(1);
      if (this.buffer.length < n + 1) break;
      const type = String.fromCharCode(this.buffer[0]),
        body = this.buffer.subarray(5, n + 1);
      this.buffer = this.buffer.subarray(n + 1);
      const p = this.pending[0];
      if (!p) {
        this.socket.destroy(new Error(`unsolicited ${type}`));
        return;
      }
      if (type === "R" && body.readInt32BE(0) !== 0) p.error = new Error("unsupported auth");
      if (type === "E") {
        const fields = {};
        let off = 0;
        while (body[off]) {
          const code = String.fromCharCode(body[off++]),
            end = body.indexOf(0, off);
          fields[code] = body.toString("utf8", off, end);
          off = end + 1;
        }
        p.error = Object.assign(new Error(fields.M), { code: fields.C });
      }
      if (type === "T") {
        let off = 2;
        p.fields = [];
        for (let k = 0; k < body.readInt16BE(0); k++) {
          const end = body.indexOf(0, off);
          p.fields.push(body.toString("utf8", off, end));
          off = end + 19;
        }
      }
      if (type === "D") {
        let off = 2;
        const row = {};
        for (let k = 0; k < body.readInt16BE(0); k++) {
          const len = body.readInt32BE(off);
          off += 4;
          row[p.fields[k]] = len < 0 ? null : body.toString("utf8", off, off + len);
          if (len > 0) off += len;
        }
        p.rows.push(row);
      }
      if (type === "C") p.commands.push(body.toString("utf8", 0, body.length - 1));
      if (type === "Z") {
        this.pending.shift();
        if (p.error) p.reject(p.error);
        else p.resolve({ rows: p.rows, commands: p.commands });
      }
    }
  }
  async batch(statements) {
    const results = statements.map(() => this.next());
    this.writes++;
    this.socket.write(Buffer.concat(statements.map(encode)));
    // [EXP-P2X2] Why: settle all responses even on an ASSERT rejection before rollback.
    // Rejected: early rejection (leaves responses assigned to the next command).
    const out = await Promise.allSettled(results);
    const failed = out.find((r) => r.status === "rejected");
    if (failed) throw failed.reason;
    return out.map((r) => r.value);
  }
  async query(sql, params = []) {
    return (await this.batch([{ sql, params }]))[0].rows;
  }
  close() {
    this.socket.end();
  }
}
