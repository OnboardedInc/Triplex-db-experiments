import { expect, it, vi } from "vitest";
import { DatomicClient } from "../src/DatomicClient.js";
const basis = { validAt: 1, recordedPosition: 1 };
const wire = (entities: unknown[]) => ({
  position: 1,
  t: "42",
  reset: false,
  entities,
  closures: [["root", ["root", "shared"]]],
});
// [DX-B6-2] Why: force reversed response delivery independent of network scheduling.
// Rejected: hoping a concurrent integration test happens to deliver a reference first.
it("waits for older inline ingestion without another HTTP call", async () => {
  const client = new DatomicClient("http://localhost:1");
  let release!: (value: unknown) => void;
  const pending = new Promise((resolve) => (release = resolve));
  const request = vi
    .spyOn(client, "request")
    .mockImplementationOnce(() => pending as any)
    .mockResolvedValueOnce(
      wire([
        ["root", 0],
        ["shared", 0],
      ]),
    );
  const older = client.reachEntities("db", ["root"], basis);
  const newer = client.reachEntities("db", ["root"], basis);
  await Promise.resolve();
  release(
    wire([
      ["root", 0, []],
      ["shared", 0, []],
    ]),
  );
  expect((await older)?.entities.size).toBe(2);
  expect((await newer)?.entities.size).toBe(2);
  expect(request).toHaveBeenCalledTimes(2);
  expect(client.reachDiagnostics.waitHits).toBe(1);
  expect(client.reachDiagnostics.fullRetries).toBe(0);
  client.close();
});
it("repairs exactly missing ids at the selected cut", async () => {
  const client = new DatomicClient("http://localhost:1");
  const request = vi
    .spyOn(client, "request")
    .mockResolvedValueOnce(
      wire([
        ["root", 0, []],
        ["shared", 0],
      ]),
    )
    .mockResolvedValueOnce({ ...wire([["shared", 0, []]]), closures: [] });
  expect((await client.reachEntities("db", ["root"], basis))?.entities.size).toBe(2);
  expect(request.mock.calls[1]![2]).toMatchObject({ need: ["shared"], basis });
  expect(client.reachDiagnostics).toMatchObject({
    needRequests: 1,
    needEntities: 1,
    fullRetries: 0,
  });
  client.close();
});
it("rejects repair bytes from another revision and retries full", async () => {
  const client = new DatomicClient("http://localhost:1");
  const request = vi
    .spyOn(client, "request")
    .mockResolvedValueOnce(
      wire([
        ["root", 0, []],
        ["shared", 0],
      ]),
    )
    .mockResolvedValueOnce(wire([["shared", 1, []]]))
    .mockResolvedValueOnce(
      wire([
        ["root", 0, []],
        ["shared", 0, []],
      ]),
    );
  expect((await client.reachEntities("db", ["root"], basis))?.entities.size).toBe(2);
  expect(request.mock.calls[2]![2]).toMatchObject({ full: true });
  expect(client.reachDiagnostics.fullRetries).toBe(1);
  client.close();
});
// [DX-H7] Why: key reuse must preserve database prefixes while calls interleave and caches reset.
// Rejected: interning IDs without their active database context.
it("keeps interned reach keys separate across databases and resets", async () => {
  const client = new DatomicClient("http://localhost:1");
  const request = vi.spyOn(client, "request").mockImplementation(
    async (_method, path) =>
      ({
        ...wire([
          ["root", 0, []],
          ["shared", 0, []],
        ]),
        reset: path.includes("/db/b/"),
      }) as any,
  );
  await Promise.all([
    client.reachEntities("a", ["root"], basis),
    client.reachEntities("b", ["root"], basis),
  ]);
  expect(client.reachCache.has("a\0root")).toBe(true);
  expect(client.reachCache.has("b\0root")).toBe(true);
  request.mockResolvedValue(
    wire([
      ["root", 0],
      ["shared", 0],
    ]),
  );
  expect((await client.reachEntities("a", ["root"], basis))?.entities.size).toBe(2);
  expect((await client.reachEntities("b", ["root"], basis))?.entities.size).toBe(2);
  expect(client.reachDiagnostics.needRequests).toBe(0);
  client.close();
});
