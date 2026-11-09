import { Effect } from "effect";
import { expect, it } from "vitest";
import { ReadError, BasisNotAvailable } from "../../src/index.js";

it("preserves discriminated catchTag handlers for normal and basis read failures", async () => {
  const normal: Effect.Effect<never, ReadError> = Effect.fail(new ReadError({ message: "normal" }));
  expect(
    await Effect.runPromise(
      normal.pipe(Effect.catchTag("ReadError", (error) => Effect.succeed(error.message))),
    ),
  ).toBe("normal");
  const basis: Effect.Effect<never, ReadError> = Effect.fail(
    new BasisNotAvailable({
      axis: "recordedAt",
      required: 2,
      observed: 1,
      waitedMs: 0,
      surface: "test",
      message: "future",
    }),
  );
  expect(
    await Effect.runPromise(
      basis.pipe(Effect.catchTag("BasisNotAvailable", (error) => Effect.succeed(error.axis))),
    ),
  ).toBe("recordedAt");
  expect(new ReadError({ message: "normal" })._tag).toBe("ReadError");
  expect(ReadError.name).toBe("ReadError");
});
