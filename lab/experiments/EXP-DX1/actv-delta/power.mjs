import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { docker, inspect } from "../../../bin/lib.mjs";

// [DX-ACT2] Why: kill only the three run-owned processes and restart the same storage volume. Rejected: stopping a shared resident or treating a warm peer cache as a crash proof.
export async function recoverPower({ created, nonce, endpoint, gateway, sql }) {
  const old = {};
  for (const role of ["gw", "tx", "pg"]) {
    const id = created.get(role),
      m = inspect(id);
    assert(m.Id === id && m.State.Running && m.Config.Labels["delta.attempt"] === nonce);
    old[role] = m.State.StartedAt;
    docker(["kill", "--signal", "KILL", id]);
    const died = inspect(id);
    assert(!died.State.Running && died.State.ExitCode === 137);
  }
  const until = async (f) => {
    for (let i = 0; i < 150; i++) {
      if (await f()) return;
      await delay(1000);
    }
    throw Error("cold storage restart deadline");
  };
  for (const role of ["pg", "tx", "gw"]) {
    const id = created.get(role);
    docker(["start", id]);
    assert(inspect(id).State.StartedAt !== old[role]);
    if (role === "pg")
      await until(() =>
        docker(["exec", id, "pg_isready", "-U", "postgres"], { allowFail: true })?.includes(
          "accepting connections",
        ),
      );
    if (role === "tx")
      await until(
        () =>
          docker(
            [
              "exec",
              id,
              "bash",
              "-c",
              "(exec 3<>/dev/tcp/$1/4334) 2>/dev/null && echo ready",
              "check",
              inspect(id).Name.slice(1),
            ],
            { allowFail: true },
          ) === "ready",
      );
    if (role === "gw")
      await until(async () => {
        const r = await fetch(endpoint + "/health", { signal: AbortSignal.timeout(2000) }).catch(
          () => undefined,
        );
        return r?.ok && (await r.json()).gatewaySourceHash === gateway;
      });
  }
  const sync = sql("select current_setting('fsync'),current_setting('synchronous_commit')");
  assert.equal(sync, "on|on");
  return {
    nonce,
    original: old,
    restarted: Object.fromEntries(
      [...created].map(([role, id]) => [role, inspect(id).State.StartedAt]),
    ),
    sync,
  };
}
