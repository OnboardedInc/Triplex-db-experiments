import { expect, it, vi } from "vitest";
import { DatomicClient } from "../src/DatomicClient.js";

// [DX-S6] With `claimAccount`, every save and every claim, begin, operation and fence lookup names the account;
// without it the requests are as before (no account field, no query string).
const calls = async (client: DatomicClient) => {
  const request = vi.spyOn(client, "request").mockResolvedValue({ txId: null, status: "absent", fenced: true, handle: "h", position: { t: "long", v: "0" }, t: { t: "long", v: "0" }, claim: null, rows: [] } as never);
  await client.claim("s2-x", "cmd", 0);
  await client.fence("s2-x", "op");
  await client.operation("s2-x", "op");
  await client.beginCommand("s2-x", { commandId: "cmd" });
  return request.mock.calls.map((c) => [c[0], c[1], c[2]]);
};

it("names the account on every lookup when configured", async () => {
  const seen = await calls(new DatomicClient("http://localhost", 5000, 1024, { claimAccount: "a/1" }));
  expect(seen).toEqual([
    ["POST", "/v1/db/s2-x/claim", { commandId: "cmd", position: 0, account: "a/1" }],
    ["POST", "/v1/db/s2-x/fence", { operationId: "op", account: "a/1" }],
    ["GET", "/v1/db/s2-x/operation/op?account=a%2F1", undefined],
    ["POST", "/v2/db/s2-x/begin", { commandId: "cmd", ids: [], account: "a/1" }],
  ]);
});

it("sends exactly today's requests without it", async () => {
  const seen = await calls(new DatomicClient("http://localhost"));
  expect(seen).toEqual([
    ["POST", "/v1/db/s2-x/claim", { commandId: "cmd", position: 0 }],
    ["POST", "/v1/db/s2-x/fence", { operationId: "op" }],
    ["GET", "/v1/db/s2-x/operation/op", undefined],
    ["POST", "/v2/db/s2-x/begin", { commandId: "cmd", ids: [] }],
  ]);
});
