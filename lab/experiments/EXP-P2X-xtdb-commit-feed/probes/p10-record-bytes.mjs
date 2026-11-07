// EXP-P2X probe 10: source-log bytes of one 10-fact Triplex commit per arm (tx ids are byte offsets,
// so the bytes are the difference between consecutive tx ids around a commit). Also prints the
// METADATA literal size. Run: XTDB_URL=... node p10-record-bytes.mjs [facts]
import { randomUUID } from 'node:crypto';
import { armRuntime, commandOps } from '../bench/lib.mjs';

const url = process.env.XTDB_URL;
const facts = Number(process.argv[2] ?? 10);
const out = {};
for (const arm of ['A0', 'C', 'A0', 'C']) {
  const rt = await armRuntime(url, arm, `p10-${arm}-${randomUUID()}`);
  await rt.run(rt.triples.transact(commandOps({ subject: 0, facts: 1, seq: 0, correction: false }, Date.now()), {}));
  const statements = [];
  const inner = rt.client.submit;
  rt.client.submit = async (s, o) => { statements.push(...s); return inner(s, o); };
  const ids = [];
  for (let i = 1; i <= 3; i++) {
    await rt.run(rt.triples.transact(commandOps({ subject: i, facts, seq: i, correction: false }, Date.now()), { commandId: `p10:${randomUUID()}` }));
    const [tip] = await rt.base.query('SELECT _id FROM xt.txs ORDER BY _id DESC LIMIT 2');
    ids.push(Number(tip._id));
  }
  const sqlChars = statements.reduce((n, s) => n + s.sql.length, 0) / 3;
  const params = statements.reduce((n, s) => n + (s.params?.length ?? 0), 0) / 3;
  (out[arm] ??= []).push({ recordBytes: [ids[1] - ids[0], ids[2] - ids[1]], statementsPerCommit: statements.length / 3, sqlCharsPerCommit: Math.round(sqlChars), paramsPerCommit: params });
  await rt.close();
}
console.log(JSON.stringify(out));
process.exit(0);
