import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
// [DX-R3-P9] Why: exercise the shipped guard's signal/cleanup path without an engine or a genuinely large file.
// Rejected: a 1 GB fixture, or trusting that a guard process can signal its owner without testing it.
test("file guard terminates its owned child and reports disk before and after",()=>{
  const dir=mkdtempSync(join(tmpdir(),"dxr3-guard-"));
  try {
    const r=spawnSync("bash",["lab/experiments/EXP-DX1/r3/guarded-run.sh","--","python3","-c",
      'import pathlib,sys,time; pathlib.Path(sys.argv[1]).write_bytes(b"x"*2048); time.sleep(20)',join(dir,"large")],
      {env:{...process.env,DX_R3_GUARD_ROOT:dir,DX_R3_GUARD_FILE_BYTES:"1024"},encoding:"utf8",timeout:8000});
    assert.equal(r.error,undefined);assert.equal(r.status,143);
    assert.match(r.stdout,/STOP file\/disk guard/);
    assert.equal(r.stdout.match(/guarded freeBytes/g)?.length,2);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
