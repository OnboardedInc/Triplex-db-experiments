// [DX-INT4] The ha1 runner's Datomic image choice: never "the newest build", only one built from the checkout's sources.
import assert from "node:assert/strict";
import test from "node:test";
import { chooseDatomicImage } from "./image-choice.ts";

const id = (c: string) => "sha256:" + c.repeat(64);
const h = (c: string) => c.repeat(64);
const mine = { sources: h("s"), buildInputs: h("m") };

test("a newer build of another branch is not chosen; this checkout's older build is", () => {
  const builds = [
    { event: "datomic-build", imageId: id("1"), buildInputsSha256: h("m") },   // this checkout's, older
    { event: "datomic-build", imageId: id("2"), buildInputsSha256: h("o") },   // another branch's, newer
  ];
  const labels: Record<string, string> = { [id("1")]: h("m"), [id("2")]: h("o") };
  const chosen = chooseDatomicImage(builds, (x) => labels[x], mine);
  assert.equal(chosen.imageId, id("1"));
  assert.equal(chosen.how, "event");
});

test("refuses when only other branches' images are present", () => {
  const builds = [{ event: "datomic-build", imageId: id("2"), buildInputsSha256: h("o") }];
  assert.throws(() => chooseDatomicImage(builds, () => h("o"), mine), /No Datomic image built from this checkout's sources/);
});

test("refuses when this checkout's build event names an image that is gone or relabelled", () => {
  const builds = [{ event: "datomic-build", imageId: id("1"), buildInputsSha256: h("m") }];
  assert.throws(() => chooseDatomicImage(builds, () => undefined, mine), /No Datomic image/);
  assert.throws(() => chooseDatomicImage(builds, () => h("x"), mine), /No Datomic image/);
});

test("a private receipt is used only when its sources are this checkout's and its image is present", () => {
  const receipt = { imageId: id("3"), buildInputsSha256: h("r"), sourceInputsSha256: h("s"), tag: "tx2-dxthin-jre21:x" };
  assert.equal(chooseDatomicImage([], () => h("r"), mine, receipt).imageId, id("3"));
  assert.throws(() => chooseDatomicImage([], () => h("r"), mine, { ...receipt, sourceInputsSha256: h("t") }), /other sources/);
  assert.throws(() => chooseDatomicImage([], () => undefined, mine, receipt), /absent/);
});
