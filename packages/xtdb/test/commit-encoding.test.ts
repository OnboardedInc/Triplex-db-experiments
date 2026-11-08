/**
 * EXP-J01 compact commit encoding on XTDB: the guards change, the rows and the journal do not.
 * Unit cases run everywhere; engine cases need XTDB_INTEGRATION=1 and XTDB_URL.
 */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { Effect, Layer } from "effect";
import { CommandAlreadyCommittedError, EntityId, Triples, string } from "@triplex-build/triplex";
import {
  Capabilities,
  DatabaseScope,
  QueryExecutor,
  Runtime,
  StorageAdapter,
} from "@triplex-build/triplex/runtime";
import { makeXtdbClient, XtdbTransactionRejected } from "../src/XtdbClient.js";
import { compactGuards, makeXtdbStorageAdapter } from "../src/XtdbStorageAdapter.js";
import { makeXtdbQueryExecutor } from "../src/XtdbQueryExecutor.js";
import { commitEncodingOf } from "../src/index.js";

const enabled = process.env["XTDB_INTEGRATION"] === "1";
const url = process.env["XTDB_URL"] ?? "postgres://xtdb:xtdb@localhost:5442/xtdb";

describe("XTDB compact commit guards (EXP-J01)", () => {
  it("are two ASSERTs whose SQL text does not depend on how many ids they guard", () => {
    const one = compactGuards("scope", 4, "op", ["cmd"], ["a"]);
    const many = compactGuards("scope", 4, "op", ["cmd", "cmd2"], ["a", "b", "c"]);
    expect(one).toHaveLength(2);
    expect(one.map((s) => s.sql)).toEqual(many.map((s) => s.sql));
    expect(one.every((s) => s.parameterSyntax === "postgresql")).toBe(true);
    expect(many[0]!.params).toEqual(["scope", 4, ["cmd", "cmd2"]]);
    expect(many[1]!.params).toEqual(["scope", "op", ["a", "b", "c"]]);
    // The failure classes A0 maps: the first is a retryable serialization conflict, the second is not.
    expect(one[0]!.sql).toMatch(/'triplex-cas-conflict'$/);
    expect(one[1]!.sql).toMatch(/'triplex-identity-conflict'$/);
    expect(one[1]!.sql).not.toMatch(/triplex-(cas|command)-conflict/);
  });

  it("drop the claim and id clauses (and their parameters) when there is nothing to guard", () => {
    const [serialization, identity] = compactGuards("scope", 0, "op", [], []);
    expect(serialization!.sql).not.toContain("tx_claims");
    expect(serialization!.params).toEqual(["scope", 0]);
    expect(identity!.sql).not.toContain("tx_assertions");
    expect(identity!.params).toEqual(["scope", "op"]);
  });

  it("selects the encoding from the option, then TRIPLEX_COMMIT_ENCODING, and rejects unknown names", () => {
    const saved = process.env["TRIPLEX_COMMIT_ENCODING"];
    try {
      delete process.env["TRIPLEX_COMMIT_ENCODING"];
      expect(commitEncodingOf(undefined)).toBeUndefined();
      process.env["TRIPLEX_COMMIT_ENCODING"] = "compact";
      expect(commitEncodingOf(undefined)).toBe("compact");
      expect(commitEncodingOf("a0")).toBe("a0");
      process.env["TRIPLEX_COMMIT_ENCODING"] = "slim";
      expect(() => commitEncodingOf(undefined)).toThrow(/TRIPLEX_COMMIT_ENCODING/);
      expect(() =>
        makeXtdbStorageAdapter({} as never, "s", { commitEncoding: "slim" as never }),
      ).toThrow();
    } finally {
      if (saved === undefined) delete process.env["TRIPLEX_COMMIT_ENCODING"];
      else process.env["TRIPLEX_COMMIT_ENCODING"] = saved;
    }
  });
});

describe.skipIf(!enabled)("XTDB compact commit guards against the engine (EXP-J01)", () => {
  // Strings a text[] parameter must carry exactly: array-literal metacharacters, SQL quoting, a raw
  // newline (which an XTDB string literal cannot hold, probe p4) and non-ASCII text.
  const tricky = [
    "plain",
    "it's",
    'quote"d',
    "back\\slash",
    "comma,brace{}",
    "NULL",
    "",
    "new\nline",
    "ünïcødé ✓ 𝄞",
    " padded ",
  ];

  const runtime = (scope: string, encoding: "a0" | "compact") => {
    const client = makeXtdbClient(url);
    const adapter = makeXtdbStorageAdapter(client, scope, { commitEncoding: encoding });
    return {
      client,
      layer: Runtime.define({
        name: `j01-${encoding}`,
        storage: Layer.succeed(StorageAdapter, adapter),
        queries: Layer.succeed(QueryExecutor, makeXtdbQueryExecutor(client, scope)),
      }).layer({ scope: DatabaseScope.test(scope), capabilities: Capabilities.none }),
    };
  };

  it("lets exactly one of two racing commands with the same id commit, for every tricky id", async () => {
    const scope = `j01-race-${randomUUID()}`;
    const { client, layer } = runtime(scope, "compact");
    try {
      for (const [i, raw] of tricky.entries()) {
        const commandId = `${raw}#${i}`;
        const outcomes = await Effect.runPromise(
          Effect.gen(function* () {
            const t = yield* Triples;
            return yield* Effect.all(
              ["left", "right"].map((side) =>
                t
                  .transact(
                    [
                      {
                        op: "assert" as const,
                        entityId: EntityId.make(`j01:race:${i}:${side}`),
                        attribute: ":j01/side",
                        value: string(side),
                      },
                    ],
                    { commandId },
                  )
                  .pipe(
                    Effect.match({
                      onFailure: (error) =>
                        error instanceof CommandAlreadyCommittedError
                          ? "duplicate"
                          : `failed:${String(error)}`,
                      onSuccess: () => "committed",
                    }),
                  ),
              ),
              { concurrency: "unbounded" },
            );
          }).pipe(Effect.provide(layer), Effect.scoped),
        );
        expect(outcomes.sort(), commandId).toEqual(["committed", "duplicate"]);
      }
    } finally {
      await client.close();
    }
  });

  it("rejects an existing assertion id and an existing operation as a definite identity conflict", async () => {
    const scope = `j01-identity-${randomUUID()}`;
    const client = makeXtdbClient(url);
    try {
      const existing = `j01-${randomUUID()}`;
      const operation = `j01-op-${randomUUID()}`;
      await client.submit([
        {
          sql: "INSERT INTO tx_assertions (_id, scope_key, id) VALUES (?, ?, ?)",
          params: [JSON.stringify([scope, existing]), scope, existing],
        },
        {
          sql: "INSERT INTO tx_attempts (_id, scope_key, operation_id) VALUES (?, ?, ?)",
          params: [JSON.stringify([scope, operation]), scope, operation],
        },
      ]);
      const attempt = (op: string, ids: string[]) =>
        client.submit(compactGuards(scope, 0, op, [], ids)).then(
          () => "passed",
          (error) =>
            error instanceof XtdbTransactionRejected
              ? String(error.message)
              : `other:${String(error)}`,
        );
      const fresh = Array.from({ length: 24 }, () => `j01-${randomUUID()}`);
      expect(await attempt(`j01-op-${randomUUID()}`, fresh)).toBe("passed");
      expect(await attempt(`j01-op-${randomUUID()}`, [...fresh.slice(1), existing])).toMatch(
        /triplex-identity-conflict/,
      );
      expect(await attempt(operation, fresh)).toMatch(/triplex-identity-conflict/);
      // The scope is part of the guard: the same id in another scope does not conflict.
      expect(
        await client
          .submit(compactGuards(`${scope}-other`, 0, `j01-op-${randomUUID()}`, [], [existing]))
          .then(() => "passed"),
      ).toBe("passed");
    } finally {
      await client.close();
    }
  });

  it("refuses a stale source cut as a serialization conflict", async () => {
    const scope = `j01-cas-${randomUUID()}`;
    const client = makeXtdbClient(url);
    try {
      await client.submit([
        {
          sql: "INSERT INTO tx_meta (_id, scope_key, position) VALUES (?, ?, ?)",
          params: [scope, scope, 3],
        },
      ]);
      const stale = await client
        .submit(compactGuards(scope, 2, `j01-op-${randomUUID()}`, [], []))
        .then(
          () => "passed",
          (error) => String(error.message),
        );
      expect(stale).toMatch(/triplex-cas-conflict/);
      expect(
        await client
          .submit(compactGuards(scope, 3, `j01-op-${randomUUID()}`, [], []))
          .then(() => "passed"),
      ).toBe("passed");
    } finally {
      await client.close();
    }
  });
});
