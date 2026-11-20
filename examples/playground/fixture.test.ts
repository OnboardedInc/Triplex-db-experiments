import assert from "node:assert/strict";
import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { actions, inputFor, openapi } from "./actions.ts";
import { generateBundle, openBundle, minuteSaves } from "./bundle.ts";
import { attrs, expected, fixtureBytes, generate, loadFixture } from "./fixture.ts";
import { rpc } from "./mcp.ts";

test("committed fixture regenerates byte for byte with deep, wide and dated synthetic data", async () => {
  const bytes = await readFile(new URL("./people.json.gz", import.meta.url));
  assert.deepEqual(bytes, fixtureBytes(generate()));
  const { fixture } = loadFixture();
  const [deep, wide, ...small] = fixture.accounts;
  assert(deep && wide && small.length === 3);
  const person = deep.people[0]!;
  assert(person.owned.reduce((n, e) => n + e.facts.length, 0) >= 140);
  for (const kind of [
    "/placement:",
    "/task:",
    "/subtask:",
    "/field:",
    "/custom:",
    "/file:",
    "/verification:",
  ])
    assert(person.owned.some((row) => row.id.includes(kind)));
  assert.equal(Object.keys(expected(wide.people[0]!, fixture.currentAt)).length, 4);
  assert.notEqual(
    expected(person, fixture.earlyAt)[attrs.note],
    expected(person, fixture.currentAt)[attrs.note],
  );
  assert.equal(fixture.currentAt - fixture.earlyAt, 36 * 86_400_000);
});

test("OpenAPI and MCP list the same validated actions", async () => {
  const noCalls = () => {
    throw new Error("Expected discovery only");
  };
  const list = await rpc({ jsonrpc: "2.0", id: 1, method: "tools/list" }, noCalls);
  assert(list && "result" in list);
  const result = list.result as { tools: { name: string }[] };
  assert.deepEqual(
    result.tools.map((t) => t.name),
    Object.keys(actions),
  );
  assert.deepEqual(
    Object.keys(openapi().paths),
    Object.keys(actions).map((name) => "/api/" + name),
  );
  assert.throws(() => inputFor("save", { changes: JSON.parse('{"__proto__":"no"}') }), /Invalid/);
  assert.throws(
    () => inputFor("load", { savesPerSecond: -1, readsPerSecond: 0, seconds: 1 }),
    /Invalid/,
  );
  assert.equal(minuteSaves(1425), 1408);
  assert.equal(minuteSaves(1439), 2364);
});

test("sample bundle verifies all objects and resumes using a byte range", async () => {
  const dir = await mkdtemp(join(tmpdir(), "triplex-play1-bundle-"));
  const source = join(dir, "source"),
    cache = join(dir, "cache");
  const served: string[] = [];
  const server = createServer(async (req, res) => {
    const file = join(source, req.url!.slice(1));
    const length = (await stat(file)).size;
    const offset = Number(/^bytes=(\d+)-$/.exec(req.headers.range ?? "")?.[1] ?? 0);
    if (offset) {
      served.push(req.url! + ":" + offset);
      res.setHeader("Content-Range", `bytes ${offset}-${length - 1}/${length}`);
    }
    res.writeHead(offset ? 206 : 200, { "content-length": length - offset });
    createReadStream(file, { start: offset }).pipe(res);
  });
  try {
    const manifest = await generateBundle(source, true);
    const local = await openBundle(source, cache);
    const { mkdir } = await import("node:fs/promises");
    const partial = join(cache, local.checksum);
    await mkdir(partial, { recursive: true });
    const first = manifest.objects[0]!.file;
    const bytes = await readFile(join(source, first));
    await writeFile(join(partial, first + ".part"), bytes.subarray(0, 200));
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    assert(address && typeof address === "object");
    const fetched = await openBundle(`http://127.0.0.1:${address.port}`, cache);
    assert.equal(fetched.checksum, local.checksum);
    assert.deepEqual(served, ["/" + first + ":200"]);
    assert.deepEqual(await readFile(join(partial, first)), bytes);
    let frames = 0,
      releases = 0;
    for await (const frame of fetched.frames()) {
      frames++;
      if (frame.kind === "release") releases++;
    }
    assert.equal(releases, 2);
    assert.equal(
      frames,
      manifest.objects.reduce((n, e) => n + e.records, 0),
    );
    bytes[201] = bytes[201]! ^ 1;
    await writeFile(join(source, first), bytes);
    await assert.rejects(openBundle(source, cache), /Invalid bundle object/);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(dir, { recursive: true, force: true });
  }
});
