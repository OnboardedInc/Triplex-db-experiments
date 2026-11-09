// [EXP-P4N-R2] Why (F3): the reference probe is shared by the arm process and the quiet-reference calibration so both measure the identical
// work: one fixed owner statement (round 3's row statement, a fixed copy independent of the build under test) on a private read-only
// connection plus JSON.parse of its 80 KB text, in main-thread CPU. Extracted unchanged from round 1's arm4.ts. A grade, never a divisor.
import path from "node:path";
export const makeProbe = (D: any, store: string, roots: string[]) => {
  const sn = (x: string) =>
    "CASE WHEN typeof(" +
    x +
    ")='integer' AND " +
    x +
    " BETWEEN -9007199254740991 AND 9007199254740991 THEN " +
    x +
    " ELSE printf('%!.17g'," +
    x +
    ") END";
  const row =
    "json_array(typeof(f.id)='blob',CASE WHEN typeof(f.id)='blob' THEN hex(f.id) ELSE f.id END,e.name,a.name,f.t,CASE WHEN f.t IN (1,3) THEN " +
    sn("f.v") +
    " WHEN f.t=5 THEN ref.name WHEN f.t=7 THEN NULL ELSE f.v END," +
    sn("tx.at") +
    ",f.pos," +
    sn("(tx.at+f.vf)") +
    ",CASE WHEN f.vto IS NULL THEN NULL ELSE " +
    sn("f.vto") +
    " END,c.s,y.s," +
    sn("coalesce(f.sv,1)") +
    ",te.name,json(CASE WHEN f.x IS NOT NULL THEN CAST(f.x AS TEXT) ELSE NULL END))";
  const cols = "o,e,id,a,pos,t,v,vf,vto,c,y,sv,x";
  const union = ["facts", "journal", "history"]
    .map(
      (t) =>
        "SELECT " +
        cols +
        " FROM " +
        t +
        " WHERE o=@o" +
        (t === "history" ? " AND rpos>@b" : "") +
        " AND pos<=@b",
    )
    .join(" UNION ALL ");
  const sql =
    "SELECT json_group_array(" +
    row +
    ") FROM (" +
    union +
    ")" +
    " f JOIN ents e ON e.eid=f.e JOIN attrs a ON a.aid=f.a JOIN txs tx ON tx.pos=f.pos JOIN ents te ON te.eid=tx.tx LEFT JOIN strs c ON c.sid=f.c LEFT JOIN strs y ON y.sid=f.y LEFT JOIN ents ref ON f.t=5 AND ref.eid=f.v";
  const db = new D(path.join(store, "broker.db"), { readonly: true, fileMustExist: true });
  db.pragma("mmap_size=268435456");
  const basis = db.prepare("SELECT position FROM marker WHERE id=1").pluck().get();
  const stmt = db.prepare(sql).pluck();
  let owner: unknown,
    fixtureRoot = "",
    text = "";
  for (let i = 100; i < roots.length; i++) {
    const o = db.prepare("SELECT eid FROM ents WHERE name=?").pluck().get(roots[i]!);
    db.exec("BEGIN");
    const t = stmt.get({ o, b: basis }) as string;
    db.exec("COMMIT");
    if (t.length >= 75000 && t.length <= 90000) {
      owner = o;
      fixtureRoot = roots[i]!;
      text = t;
      break;
    }
  }
  if (!text) throw Error("no probe fixture of about 80 KB found");
  const tcpu = () => {
    const c = process.threadCpuUsage();
    return c.user + c.system;
  };
  const probe = () => {
    const N = 40;
    let sqlUs = 0,
      parseUs = 0,
      sink = 0;
    for (let i = -5; i < N; i++) {
      const a = tcpu();
      db.exec("BEGIN");
      const t = stmt.get({ o: owner, b: basis }) as string;
      db.exec("COMMIT");
      const b = tcpu();
      sink += (JSON.parse(t) as unknown[]).length;
      const c = tcpu();
      if (i >= 0) {
        sqlUs += b - a;
        parseUs += c - b;
      }
    }
    return {
      sqlUs: sqlUs / N,
      parseUs: parseUs / N,
      totalUs: (sqlUs + parseUs) / N,
      bytes: text.length,
      sink,
    };
  };
  return {
    probe,
    fixture: { owner: fixtureRoot, basis, bytes: text.length },
    close: () => db.close(),
  };
};
