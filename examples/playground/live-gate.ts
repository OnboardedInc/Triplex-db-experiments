import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Reply } from "./actions.ts";
import { attrs, expected, generate, loadFixture } from "./fixture.ts";
import { setTimeout as delay } from "node:timers/promises";
import { repo } from "./stack.ts";

type Row = Record<string, any>;

export async function liveGate(url: string, checksum: string) {
  const fixture = generate();
  const account = fixture.accounts[0]!;
  const person = account.people[0]!;
  const subject = { accountId: account.id, personId: person.id };
  const observed = new Map<string, { reply: Reply; status: number }>();
  const run = async (action: string, input: object = {}, status = 200, key = action) => {
    const response = await fetch(url + "/api/" + action, {
      method: "POST",
      body: JSON.stringify(input),
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(90_000),
    });
    const reply = (await response.json()) as Reply;
    assert.equal(response.status, status, JSON.stringify(reply));
    assert.equal(reply.ok, status === 200);
    assert(Array.isArray(reply.records) && reply.timings && Number.isFinite(reply.timings.totalMs));
    observed.set(key, { reply, status });
    return reply as Row;
  };
  const catalog = await run("accounts");
  assert.equal(catalog["fixtureSha256"], checksum);
  assert.deepEqual(
    catalog["records"].map((a: Row) => [a["id"], a["people"]]),
    fixture.accounts.map((a) => [a.id, a.count]),
  );
  assert.ok(catalog["firstRelease"]?.receipt?.txId);
  const people = await run("people", { accountId: account.id });
  assert.deepEqual(
    people["records"],
    account.people.map(({ id, name }) => ({ id, name })),
  );
  const rootFields = (reply: Row) =>
    Object.fromEntries(
      reply["records"]
        .filter((row: Row) => row["entityId"] === person.id)
        .map((row: Row) => [row["attribute"], row["value"]]),
    );
  const current = await run("current", subject);
  assert.deepEqual(rootFields(current), expected(person, fixture.currentAt));
  const map = new Map(
    current["records"].map((row: Row) => [
      JSON.stringify([row["entityId"], row["attribute"]]),
      row["value"],
    ]),
  );
  assert.equal(map.size, current["records"].length);
  for (const child of person.owned)
    for (const [attribute, value, kind] of child.facts) {
      assert.equal(
        map.get(JSON.stringify([child.id, attribute])),
        kind === "integer" ? value : kind === "boolean" ? Number(value === "true") : value,
      );
    }
  const earlier = await run("earlier", subject);
  assert.deepEqual(rootFields(earlier), expected(person, fixture.earlyAt));
  assert(earlier["diff"].some((row: Row) => row["attribute"] === attrs.note));
  assert(earlier["position"] < current["position"]);
  const history = await run("history", subject);
  assert(history["records"].length >= 4);
  assert(
    history["records"].every((tx: Row) =>
      tx["changes"].every((c: Row) => c["entityId"] === person.id),
    ),
  );
  assert(
    history["records"][0].changes.some(
      (change: Row) =>
        change["attribute"] === attrs.note &&
        change["value"]?.value === expected(person, fixture.currentAt)[attrs.note],
    ),
  );
  const checkpoint = await run("feed", {}, 200, "feed-start");
  const write = {
    ...subject,
    expectedPosition: current["position"],
    commandId: "gate-save",
    changes: { [attrs.status]: "Review", [attrs.note]: "Synthetic-gate-edit" },
  };
  const saved = await run("save", write);
  assert.equal(rootFields(saved)[attrs.note], write.changes[attrs.note]);
  assert.equal(rootFields(saved)[attrs.status], write.changes[attrs.status]);
  assert.equal(saved["receipt"].commandId, write.commandId);
  assert(saved["position"] > current["position"]);
  const duplicate = await run("duplicate", {
    ...write,
    expectedPosition: saved["position"],
    commandId: "gate-retry",
  });
  assert.deepEqual(
    duplicate["attempts"].map((row: Row) => row["duplicate"]),
    [false, true],
  );
  assert.deepEqual(duplicate["attempts"][0].receipt, duplicate["attempts"][1].receipt);
  const stale = await run("save", { ...write, commandId: "gate-stale" }, 409, "stale");
  assert.equal(stale["error"].code, "StaleSave");
  const mismatch = await run(
    "save",
    { ...write, changes: { [attrs.note]: "Different intent" } },
    409,
    "key-reuse",
  );
  assert.equal(mismatch["error"].code, "CommandReused");
  const changes = await run("feed", { fromT: checkpoint["nextT"], waitMs: 1000 });
  const commands = changes["records"].flatMap((row: Row) => row["transaction"]?.commandIds ?? []);
  assert.equal(
    commands.filter((command: string) => command === "playground-save:gate-save").length,
    1,
  );
  assert.equal(
    commands.filter((command: string) => command === "playground-save:gate-retry").length,
    1,
  );
  const replay = await run("feed", { fromT: checkpoint["nextT"] }, 200, "feed-replay");
  assert.deepEqual(replay["records"], changes["records"]);
  const release = await run("publish", {
    ...subject,
    label: "Circuit gate",
    reviewStatus: "Review",
  });
  assert.deepEqual(release["records"], [
    { personId: person.id, status: "Review", decision: "Review required" },
  ]);
  let materialized;
  for (let i = 0; i < 20; i++) {
    materialized = await run("release", { ...subject, releaseId: release["releaseId"] });
    if (materialized["progress"].state !== "writing") break;
    await delay(250);
  }
  assert.equal(materialized?.["progress"].state, "complete");
  assert.equal(materialized["progress"].written, account.people.length);
  assert.deepEqual(materialized["records"], release["records"]);
  const erasure = await run("erase", subject, 503);
  assert.equal(erasure["error"].code, "ErasureUnavailable");
  const native = await run("native", { query: catalog["examples"][0].query });
  assert(
    native["records"].some(
      ([id, name]: Row[]) => id?.["v"] === person.id && name?.["v"] === person.name,
    ),
  );
  const load = await run("load", { seconds: 1, savesPerSecond: 1, readsPerSecond: 2 });
  assert.equal(load["label"], "Laptop diagnostic");
  assert.deepEqual(
    load["records"].map((r: Row) => [r["kind"], r["completed"], r["errors"]]),
    [
      ["save", 1, 0],
      ["read", 2, 0],
    ],
  );
  assert(load["records"].every((r: Row) => r["p99Ms"] >= r["p50Ms"] && r["p50Ms"] >= 0));
  const openapi = (await (await fetch(url + "/openapi.json")).json()) as Row;
  assert.equal(Object.keys(openapi["paths"]).length, 13);
  const rpc = async (message: object, status = 200) => {
    const res = await fetch(url + "/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": "2025-11-25",
      },
      body: JSON.stringify({ jsonrpc: "2.0", ...message }),
    });
    assert.equal(res.status, status);
    return status === 202 ? null : ((await res.json()) as Row);
  };
  const initialized = await rpc({
    id: 1,
    method: "initialize",
    params: { protocolVersion: "2025-11-25" },
  });
  assert.equal(initialized?.["result"].protocolVersion, "2025-11-25");
  await rpc({ method: "notifications/initialized" }, 202);
  const tools = await rpc({ id: 2, method: "tools/list" });
  assert.equal(tools?.["result"].tools.length, 13);
  const viaHttp = await rpc({
    id: 3,
    method: "tools/call",
    params: { name: "current", arguments: subject },
  });
  assert.equal(
    rootFields(viaHttp?.["result"].structuredContent)[attrs.note],
    write.changes[attrs.note],
  );
  const viaStdio = await stdioCall(new URL(url).port, subject);
  assert.equal(
    rootFields(viaStdio["result"].structuredContent)[attrs.note],
    write.changes[attrs.note],
  );
  const rejected = await fetch(url + "/api/save", {
    method: "POST",
    headers: { origin: "https://invalid.example", "content-type": "application/json" },
    body: JSON.stringify(write),
  });
  assert.equal(rejected.status, 403);
  return Object.fromEntries(
    [...observed].map(([name, { reply, status }]) => [
      name,
      {
        status,
        position: reply.position,
        receipt: reply.receipt,
        error: reply.error,
        timings: reply.timings,
        recordCount: reply.records.length,
      },
    ]),
  );
}

async function stdioCall(port: string, subject: object) {
  const child = spawn(process.execPath, ["examples/playground/cli.ts", "mcp", "--port", port], {
    cwd: repo,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const result = new Promise<Row>((resolve, reject) => {
    const chunks: Buffer[] = [];
    child.stdout.on("data", (chunk) => chunks.push(chunk));
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code) return reject(new Error("stdio subprocess exited " + code));
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8").trim().split("\n").at(-1)!));
      } catch (error) {
        reject(error);
      }
    });
  });
  child.stdin.end(
    [
      { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-11-25" } },
      { jsonrpc: "2.0", method: "notifications/initialized" },
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "current", arguments: subject },
      },
    ]
      .map((value) => JSON.stringify(value))
      .join("\n") + "\n",
  );
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const url = process.argv[2];
  assert(url && /^http:\/\/127\.0\.0\.1:\d+$/.test(url), "Use the fresh local playground address");
  const results = await liveGate(url, loadFixture().checksum);
  console.log(JSON.stringify(results, null, 2));
}
