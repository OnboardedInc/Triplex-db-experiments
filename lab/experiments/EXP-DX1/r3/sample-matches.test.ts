import test from "node:test";
import assert from "node:assert/strict";
import { R, type ReadRecord } from "../../../bench/lib/observe.ts";
import { sampleMatches } from "../../../bench/lib/sample-matches.ts";
test("raw samples bind to first complete attempt in one traversal", () => {
 const row = (phase: number, start: number, subject: number, rt: number, vt: number): ReadRecord => {
  const r = new Array(21).fill(0) as ReadRecord;
  r[R.phase]=phase;r[R.start]=start;r[R.subject]=subject;r[R.recordedAt]=rt;r[R.validAt]=vt;return r;
 };
 const a=row(1,2,3,4,5), collision=row(1,2,8,4,5), b=row(2,3,4,5,-0), plus=row(2,3,4,5,0);
 const samples=[a,collision,b].map(r=>({phase:r[R.phase], start:r[R.start],subject:r[R.subject],basis:{recordedAt:r[R.recordedAt],validAt:r[R.validAt]}}));
 samples.push({phase:99,start:2,subject:3,basis:{recordedAt:4,validAt:5}});
 let passes=0,visits=0;
 const records={ *[Symbol.iterator]() { assert.equal(++passes,1);for(const r of [collision,a,plus,b,{...a} as unknown as ReadRecord]) {visits++;yield r;} } };
 const found=sampleMatches(records,samples);
 assert.equal(found[0],a);assert.equal(found[1],collision);assert.equal(found[2],b);assert.equal(found[3],undefined);assert.equal(visits,5);
 assert.deepEqual(sampleMatches([], []), []);
});
