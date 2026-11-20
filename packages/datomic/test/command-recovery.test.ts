import { expect, it, vi } from "vitest";
import { DatomicClient, DatomicHttpError, DatomicTransportError } from "../src/DatomicClient.js";

const committed = {
  commandId: "edit",
  txId: "_tx/original",
  receipt: {
    status: "committed",
    operationId: "original-operation",
    position: { t: "long", v: "2" },
    t: { t: "long", v: "1012" },
    recordedAt: { t: "double", v: 1001 },
  },
};
const input = {
  operationId: "retry-operation",
  attemptId: "retry-1",
  sourceK: null,
  claims: [{ commandId: "edit", txId: "_tx/retry", timestamp: 1000 }],
  position: 2,
  newIds: [],
  rows: [],
};

it.each(["OperationDuplicate", "CommandConflict", "CasConflict", "OutcomeUnknown"])(
  "recovers the original grouped replacement after %s",
  async (code) => {
    const client = new DatomicClient("http://localhost");
    const transact = vi
      .spyOn(client, "transact")
      .mockRejectedValue(new DatomicHttpError(409, code, code));
    const lookup = vi.spyOn(client, "request").mockResolvedValue(committed);
    const offer =
      code === "OperationDuplicate" ? { ...input, operationId: "original-operation" } : input;
    await expect(client.transactCommand("s2-test", offer)).resolves.toEqual({
      commandId: "edit",
      txId: "_tx/original",
      operationId: "original-operation",
      position: 2,
      t: "1012",
      recordedAt: 1001,
    });
    expect(transact).toHaveBeenCalledExactlyOnceWith("s2-test", offer);
    expect(lookup).toHaveBeenCalledExactlyOnceWith(
      "POST",
      "/v1/db/s2-test/claim",
      { commandId: "edit", receipt: true },
      expect.any(Number),
    );
  },
);

it("returns the original CAS conflict if the command never committed", async () => {
  const client = new DatomicClient("http://localhost");
  const conflict = new DatomicHttpError(409, "CasConflict", "Predecessor retired");
  vi.spyOn(client, "transact").mockRejectedValue(conflict);
  const lookup = vi.spyOn(client, "request").mockResolvedValue({ txId: null });
  await expect(client.transactCommand("s2-test", input)).rejects.toBe(conflict);
  expect(lookup).toHaveBeenCalledTimes(1);
});

it("keeps the decision ambiguous when the CAS claim lookup is interrupted", async () => {
  const client = new DatomicClient("http://localhost");
  const conflict = new DatomicHttpError(409, "CasConflict", "Predecessor retired");
  const interrupted = new DatomicTransportError("Reader connection closed");
  const transact = vi.spyOn(client, "transact").mockRejectedValue(conflict);
  const lookup = vi.spyOn(client, "request").mockRejectedValue(interrupted);
  await expect(client.transactCommand("s2-test", input)).rejects.toBe(interrupted);
  expect(transact).toHaveBeenCalledTimes(1);
  expect(lookup).toHaveBeenCalledTimes(1);
});
