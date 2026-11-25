import { expect, it, vi } from "vitest";
import { DatomicClient, DatomicHttpError, DatomicOperationFenced, DatomicTransportError } from "../src/DatomicClient.js";

// [DX-S6] F1: an unknown outcome is decided by lookup, then fence; the original receipt when it committed.
const receipt = { status: "committed", operationId: "op", position: { t: "long", v: "7" }, t: { t: "long", v: "1020" }, recordedAt: { t: "double", v: 5 } };
const frame = { operationId: "op", attemptId: "a", sourceK: null, claims: [], position: 7, newIds: [], rows: [] };

it.each([
  ["a lost connection", new DatomicTransportError("socket hang up")],
  ["503 OutcomeUnknown", new DatomicHttpError(503, "OutcomeUnknown", "Commit outcome unknown")],
])("returns the original receipt after %s when the save committed", async (_label, failure) => {
  const client = new DatomicClient("http://localhost");
  vi.spyOn(client, "transact").mockRejectedValue(failure);
  const request = vi.spyOn(client, "request").mockResolvedValueOnce({ status: "absent" }).mockResolvedValueOnce(receipt);
  await expect(client.transactResolved("s2-test", frame)).resolves.toMatchObject({ status: "committed", position: receipt.position, resolved: true });
  expect(request.mock.calls.map((c) => [c[0], c[1]])).toEqual([["GET", "/v1/db/s2-test/operation/op"], ["POST", "/v1/db/s2-test/fence"]]);
});

it("answers a decided refusal when the fence finds the save never committed", async () => {
  const client = new DatomicClient("http://localhost");
  vi.spyOn(client, "transact").mockRejectedValue(new DatomicHttpError(503, "OutcomeUnknown", "x"));
  vi.spyOn(client, "request").mockResolvedValueOnce({ status: "absent" }).mockResolvedValueOnce({ status: "absent", fenced: true });
  await expect(client.transactResolved("s2-test", frame)).rejects.toBeInstanceOf(DatomicOperationFenced);
});

it("keeps looking while the lookup itself fails, then decides", async () => {
  const client = new DatomicClient("http://localhost");
  vi.spyOn(client, "transact").mockRejectedValue(new DatomicTransportError("reset"));
  vi.spyOn(client, "request")
    .mockRejectedValueOnce(new DatomicTransportError("refused"))
    .mockRejectedValueOnce(new DatomicHttpError(503, "OutcomeUnknown", "fence outcome unknown"))
    .mockResolvedValueOnce({ status: "absent", fenced: true });
  await expect(client.transactResolved("s2-test", frame)).rejects.toBeInstanceOf(DatomicOperationFenced);
});

it("never resolves a decided refusal: a 409 conflict stays final", async () => {
  const client = new DatomicClient("http://localhost");
  const conflict = new DatomicHttpError(409, "CasConflict", "moved");
  vi.spyOn(client, "transact").mockRejectedValue(conflict);
  const request = vi.spyOn(client, "request");
  await expect(client.transactResolved("s2-test", frame)).rejects.toBe(conflict);
  expect(request).not.toHaveBeenCalled();
});
