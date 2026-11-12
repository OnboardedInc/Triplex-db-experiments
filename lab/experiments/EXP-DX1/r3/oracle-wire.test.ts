import test from "node:test";
import assert from "node:assert/strict";
import { oraclePublicValue } from "../../../bench/lib/oracle-public-value.ts";
import { memberOf } from "../../../bench/lib/world.ts";
test("oracle binary64 wire witnesses decode to exact public values", () => {
  const wire = { type: "datetime", value: 1699827200000, bits: "0x4278bc598b000000" };
  assert.equal(
    memberOf("e", "a", oraclePublicValue(wire)),
    memberOf("e", "a", { type: "datetime", value: 1699827200000 }),
  );
  const negative = oraclePublicValue({ type: "number", value: 0, bits: "0x8000000000000000" });
  assert(Object.is(negative.value, -0));
  assert.notEqual(memberOf("e", "a", negative), memberOf("e", "a", { type: "number", value: 0 }));
  for (const changed of [
    { ...wire, value: 1 },
    { ...wire, bits: "0x7ff0000000000000" },
    { ...wire, bits: undefined },
    { ...wire, extra: 1 },
  ])
    assert.throws(() => oraclePublicValue(changed));
  assert.throws(() =>
    oraclePublicValue({
      ...wire,
      get extra() {
        throw Error("accessor");
      },
    }),
  );
  const ordinary = { type: "json", value: { bits: "user data" } };
  assert.equal(oraclePublicValue(ordinary), ordinary);
});

import { createHash } from "node:crypto";
import { requireOracleBinding } from "../../../bench/lib/oracle-output.ts";
test("oracle outputs bind exact case bytes and complete query identities", () => {
  const input = { caseId: "attempt-a", queries: [{ id: "r0|e", kind: "entityTriples" }] },
    text = JSON.stringify(input);
  const output = {
    format: "triplex-db-2/o-replay-expected/1",
    caseId: input.caseId,
    caseSha256: createHash("sha256").update(text).digest("hex"),
    queries: [{ id: "r0|e", kind: "entityTriples", result: { raw: [] } }],
  };
  requireOracleBinding(output, text, input);
  for (const changed of [
    { ...output, caseId: "earlier-attempt" },
    { ...output, caseSha256: "stale" },
    { ...output, queries: [] },
    { ...output, queries: [...output.queries, ...output.queries] },
    { ...output, queries: [{ ...output.queries[0], id: "other" }] },
    { ...output, queries: [{ ...output.queries[0], result: {} }] },
  ])
    assert.throws(() => requireOracleBinding(changed, text, input));
});

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkWithOracle } from "../../../bench/lib/oracle.ts";
test("oracle PASS requires exact rows plus both successful independent verdicts", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dxr3-oracle-fixture-"));
  const cli = path.join(root, "lab/oracles/replay/cli.py");
  fs.mkdirSync(path.dirname(cli), { recursive: true });
  fs.writeFileSync(
    cli,
    `import json,sys,hashlib
raw=open(sys.argv[1],'rb').read();case=json.loads(raw);mode=case['testMode']
if mode=='exit':sys.exit(1)
out={'format':'triplex-db-2/o-replay-expected/1','caseId':case['caseId'],'caseSha256':hashlib.sha256(raw).hexdigest(),'verdict':'FAIL' if mode=='verdict' else 'PASS','receiptConsistency':{'status':'FAIL' if mode=='receipt' else 'PASS'},'queries':[{'id':'r0|e','kind':'entityTriples','result':{'raw':[{'entityId':'e','attribute':'a','value':{'type':'datetime','value':0,'bits':'0x0000000000000000'}}]}}]}
if mode=='missing':out['queries']=[]
if mode=='stale':out['caseSha256']='stale'
if mode=='wrong':out['queries'][0]['result']['raw'][0]['attribute']='wrong'
json.dump(out,open(sys.argv[3],'w'))
`,
  );
  const previous = process.env.TX2_ORACLE_BRIDGE;
  delete process.env.TX2_ORACLE_BRIDGE;
  try {
    for (const mode of ["correct", "verdict", "receipt", "wrong", "missing", "stale", "exit"]) {
      const dir = path.join(root, mode);
      fs.mkdirSync(dir);
      if (mode === "exit")
        fs.writeFileSync(
          path.join(dir, "oracle-expected.json"),
          fs.readFileSync(path.join(root, "correct/oracle-expected.json")),
        );
      const run = () =>
        checkWithOracle({
          oracleRoot: root,
          dir,
          caseDoc: {
            caseId: "fixture",
            testMode: mode,
            queries: [{ id: "r0|e", kind: "entityTriples" }],
          },
          reads: [
            {
              subject: 0,
              basis: { recordedAt: 1, validAt: 1 },
              rows: [["e", "a", { type: "datetime", value: 0 }, 0, null, "assertion"]],
            },
          ],
        });
      if (mode === "missing" || mode === "stale") assert.throws(run);
      else
        assert.equal(
          run().status,
          mode === "correct" ? "PASS" : mode === "exit" ? "ORACLE-ERROR" : "FAIL",
        );
    }
  } finally {
    if (previous === undefined) delete process.env.TX2_ORACLE_BRIDGE;
    else process.env.TX2_ORACLE_BRIDGE = previous;
    fs.rmSync(root, { recursive: true, force: true });
  }
});
