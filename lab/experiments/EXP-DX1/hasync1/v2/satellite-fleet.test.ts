import assert from "node:assert/strict";
import test from "node:test";
import { Satellite } from "../../ha1/satellite.ts";

test("a fleet cut accepts only distinct containers minted for this attempt", async () => {
  const nonce = "2809cb67-3c89-47a7-a047-f3edcba16d89";
  const prefix = "tx2-ha1-2809cb67";
  const label = "ha1.attempt=" + nonce;
  const network = "a".repeat(64);
  const first = "b".repeat(64);
  const second = "c".repeat(64);
  const outsider = "d".repeat(64);
  const image = "sha256:" + "f".repeat(64);
  const owner = new Satellite(nonce, prefix, "/repo", [image], "/seed", true);
  await owner.call(["network", "create", "--label", label, prefix], async () => network);
  for (const [i, id] of [first, second].entries())
    await owner.call(
      [
        "create",
        "--pull",
        "never",
        "--name",
        prefix + "-fleet-a-pg" + i,
        "--label",
        label,
        "--network",
        network,
        "--network-alias",
        "db-a-s2-V29yaw",
        "--entrypoint",
        "/bin/sh",
        image,
        "-c",
        "exit 0",
      ],
      async () => id,
    );
  const invoke = async (args: string[]) => args.join(" ");
  assert.equal(
    await owner.call(["kill", "--signal", "KILL", first, second], invoke),
    "kill --signal KILL " + first + " " + second,
  );
  await assert.rejects(owner.call(["kill", "--signal", "KILL", first, outsider], invoke));
  await assert.rejects(owner.call(["kill", "--signal", "KILL", first, first], invoke));
  await assert.rejects(owner.call(["kill", "--signal", "STOP", first, second], invoke));
});
