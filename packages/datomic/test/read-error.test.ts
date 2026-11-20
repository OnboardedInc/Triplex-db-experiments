import { expect, it } from "vitest";
import { describeReadError } from "../../../lab/bench/lib/read-error.ts";

it("retains typed transport causes through ReadError without messages or addresses", () => {
  const socket = Object.assign(new Error("socket hang up for private-address"), {
    code: "ECONNRESET",
  });
  const error = Object.assign(
    new Error("Datomic read failed", { cause: new Error("transport", { cause: socket }) }),
    { _tag: "ReadError" },
  );
  const result = describeReadError(error);
  expect(result.truncated).toBe(false);
  expect(result.causes.map((e) => e.code)).toEqual([undefined, undefined, "ECONNRESET"]);
  expect(result.causes[0]!.tag).toBe("ReadError");
  expect(result.causes[2]!.reason).toBe("socket-hang-up");
  expect(JSON.stringify(result)).not.toContain("private-address");
});

it("bounds cyclic and aggregate chains and rejects unsafe labels", () => {
  const cyclic: any = { name: "Error", code: "https://private-address" };
  cyclic.cause = cyclic;
  expect(describeReadError(cyclic)).toEqual({
    causes: [
      { name: "Error", tag: undefined, code: undefined, status: undefined, reason: undefined },
    ],
    truncated: false,
  });
  const result = describeReadError(
    new AggregateError(Array.from({ length: 12 }, () => new Error("x"))),
  );
  expect(result.causes).toHaveLength(8);
  expect(result.truncated).toBe(true);
});

it("distinguishes a deadline and retains an HTTP status", () => {
  const result = describeReadError(
    Object.assign(new Error("Gateway deadline exceeded"), {
      status: 503,
      code: "GatewayUnavailable",
    }),
  );
  expect(result.causes[0]).toMatchObject({
    status: 503,
    code: "GatewayUnavailable",
    reason: "deadline",
  });
});

it("keeps only repository-relative TypeError locations", () => {
  const error = new TypeError("private input");
  error.stack = ["TypeError: private input", "  at read (/private/prefix/lab/bench/lib/path.ts:11:22)",
    "  at package (file:///other/packages/datomic/dist/client.js:33:44)",
    "  at other (/private/prefix/other.ts:55:66)"].join("\n");
  const result = describeReadError(error);
  expect(result.causes[0]!.frames).toEqual(["lab/bench/lib/path.ts:11:22", "packages/datomic/dist/client.js:33:44"]);
  expect(JSON.stringify(result)).not.toContain("private");
});
