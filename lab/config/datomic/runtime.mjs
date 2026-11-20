import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const runtimes = {
  "21": {
    major: "21",
    version: "21.0.13+9",
    base: "eclipse-temurin:21.0.13_9-jre-noble@sha256:0eda5830ed7b669abc246a8dc520ea8a23cab06f9a8d4b6964109e2f2394e46f",
    tag: "tx2-datomic:1.0.7745-da00",
  },
  "25": {
    major: "25",
    version: "25.0.5+8",
    base: "eclipse-temurin:25.0.5_8-jre-noble@sha256:23481dc33a759b79d62814ceb1ec27a0d1a84da9d7aab0609577427176fbb1b7",
    tag: "tx2-datomic:1.0.7745-jre25",
  },
};

// [DX-JVM1] Why: one selector names the JVM used by the transactor and both peers.
// Rejected: moving the Java 21 tag or resolving the Java 25 parent by mutable tag.
export function datomicRuntime(major = process.env.DX_JAVA ?? "21") {
  assert(major === "21" || major === "25", "DX_JAVA must be 21 or 25");
  return runtimes[major];
}

/** @param {string} major @param {string} role */
export function javaCompatibility(major, role) {
  datomicRuntime(major);
  return major === "25"
    ? ["--sun-misc-unsafe-memory-access=allow", ...(role === "tx" ? [] : ["--enable-native-access=ALL-UNNAMED"])]
    : [];
}

/** @param {string | undefined} file */
export function readVariantReceipt(file, runtime = datomicRuntime()) {
  assert(file, "Supply a private Datomic image receipt");
  const receipt = JSON.parse(readFileSync(file, "utf8"));
  assert.deepEqual(receipt.runtime, runtime);
  assert.match(receipt.imageId, /^sha256:[a-f0-9]{64}$/);
  assert.match(receipt.buildInputsSha256, /^[a-f0-9]{64}$/);
  assert.match(receipt.sourceInputsSha256, /^[a-f0-9]{64}$/);
  assert.equal(receipt.sourceInputsSha256, receipt.sources.sha256);
  assert.equal(receipt.buildInputsSha256, createHash("sha256").update(JSON.stringify({
    sources: receipt.sources, distribution: receipt.distribution, runtime,
  })).digest("hex"));
  assert.equal(receipt.tag, "tx2-dxjvm1-jre" + runtime.major + ":" + receipt.buildInputsSha256.slice(0, 16));
  return receipt;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const runtime = datomicRuntime(), field = process.argv[2];
  if (field === "compatibility") console.log(javaCompatibility(runtime.major, process.argv[3]).join(" "));
  else if (field === "input-hash") console.log(readVariantReceipt(process.env.DX_DATOMIC_IMAGE_RECEIPT, runtime).buildInputsSha256);
  else if (field === "image") console.log(process.env.DX_DATOMIC_IMAGE_RECEIPT
    ? readVariantReceipt(process.env.DX_DATOMIC_IMAGE_RECEIPT, runtime).imageId : runtime.tag);
  else {
    assert(field === "major" || field === "version" || field === "base" || field === "tag");
    console.log(runtime[field]);
  }
}
