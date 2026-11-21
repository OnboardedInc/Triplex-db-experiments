import { expect, it, vi } from "vitest";
import { DatomicClient } from "../src/DatomicClient.js";
import { stringifyExact } from "../src/codec.js";
import { withDatomicErasureSequence } from "../src/erasure.js";

it.each([undefined, "s2-source"])(
  "carries a removal ticket on an ordinary write from %s",
  async (source) => {
    const client = new DatomicClient("http://localhost");
    const frames: unknown[] = [];
    const request = vi.spyOn(client, "request").mockImplementation(async function <T>(
      ...args: Parameters<DatomicClient["request"]>
    ): Promise<T> {
      frames.push(JSON.parse(stringifyExact(args[2])));
      return {} as T;
    });
    const input = {
      sourceK: 1,
      position: 2,
      operationId: "prepare-operation",
      attemptId: "current-attempt",
      rows: [],
      newIds: [],
      claims: [{ commandId: "settle-value", txId: "settlement", timestamp: 41 }],
    };
    try {
      await withDatomicErasureSequence(
        0,
        () => client.transact("s2-destination", input),
        false,
        source,
      );
      expect(request).toHaveBeenCalledOnce();
      expect(request.mock.calls[0]?.slice(0, 2)).toEqual([
        "POST",
        "/v1/db/s2-destination/transact",
      ]);
      expect(frames).toEqual([
        {
          ...input,
          erasureSeq: 0,
          erasureReplay: false,
          ...(source ? { erasureSourceDatabase: source } : {}),
          rowTexts: {},
        },
      ]);
    } finally {
      client.close();
    }
  },
);
