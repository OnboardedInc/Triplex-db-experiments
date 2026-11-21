import { execFileSync } from "node:child_process";
import { readFile, realpath } from "node:fs/promises";
import { dirname, join } from "node:path";

type Grant = {
  prefix: string;
  checkout: string;
  head: string;
  ownerFile: string;
  pid: number;
  expires: number;
};
const git = (cwd: string, ...args: string[]) =>
  execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

export async function labPrefix(checkout: string, host: string, context?: string) {
  if (!host.includes("/.colima/triplex2/")) return undefined;
  const file = process.env["PLAYGROUND_LAB_GRANT"];
  if (!file || context !== undefined || process.platform !== "darwin")
    throw new Error("The private lab daemon requires the engine.mjs play1 gate");
  // [DX-PLAY1] Why: run the actual CLI in a second clean checkout under the parent engine's reservation.
  // Rejected: a boolean bypass of the private-Docker guard or an unreserved attempt at plain Docker.
  const grant = JSON.parse(await readFile(file, "utf8")) as Grant;
  if (
    !/^tx2-dxplay1-[a-f0-9]{12}$/.test(grant.prefix) ||
    grant.checkout !== (await realpath(checkout)) ||
    grant.head !== git(checkout, "rev-parse", "HEAD") ||
    !Number.isSafeInteger(grant.pid) ||
    grant.pid < 2 ||
    !Number.isSafeInteger(grant.expires) ||
    grant.expires < Date.now()
  )
    throw new Error("The playground lab grant does not match this checkout");
  const owner = JSON.parse(await readFile(grant.ownerFile, "utf8")) as {
    lane: string;
    holder: string;
    experiment: string;
    pid: number;
    slot: string;
    worktree: string;
  };
  if (
    owner.holder !== "DX-PLAY1" ||
    owner.lane !== "datomic" ||
    !/^s[123]$/.test(owner.slot) ||
    owner.experiment !== "DX-PLAY1-playground" ||
    owner.pid !== grant.pid ||
    git(owner.worktree, "rev-parse", "HEAD") !== grant.head
  )
    throw new Error("The exclusive playground slot is no longer owned by its launcher");
  process.kill(owner.pid, 0);
  const locks = join(
    dirname(git(owner.worktree, "rev-parse", "--path-format=absolute", "--git-common-dir")),
    "lab",
    "locks",
  );
  if (
    (await realpath(grant.ownerFile)) !==
    (await realpath(join(locks, "datomic-" + owner.slot, "owner.json")))
  )
    throw new Error("The playground lab grant does not name a canonical slot");
  const pool = JSON.parse(await readFile(join(locks, "pool.json"), "utf8")) as {
    reservations: { holder: string; pid: number; lane: string; slot: string; container: string }[];
  };
  for (const role of ["pg", "tx", "write", "read"]) {
    if (
      !pool.reservations.some(
        (r) =>
          r.holder === owner.holder &&
          r.pid === owner.pid &&
          r.lane === owner.lane &&
          r.slot === owner.slot &&
          r.container === grant.prefix + "-" + role,
      )
    )
      throw new Error("The current lab reservation does not cover every role");
  }
  return grant.prefix;
}
