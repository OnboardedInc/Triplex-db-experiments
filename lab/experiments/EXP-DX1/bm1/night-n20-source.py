"""Generate only the bench adaptations for the pinned November 20 producers."""

import hashlib
import json
from pathlib import Path
import subprocess
import sys

BASE = Path("lab/experiments/EXP-DX1")
PRODUCERS = {
    "jvm25": ("5a96527807fd646fbc866b33dc72565481c409e0", BASE/"jvm1/server.ts"),
    "tail-backlog": ("da4c34f48f3749afcacfe45ac51a727ab0a2160a", BASE/"tail1/backlog-server.ts"),
    "jvm25-retry": ("5a96527807fd646fbc866b33dc72565481c409e0", BASE/"jvm1/server.ts"),
    "tail-backlog-integrated": ("5a96527807fd646fbc866b33dc72565481c409e0", BASE/"tail1/backlog-server.ts"),
    "tail-backlog-generation": ("5a96527807fd646fbc866b33dc72565481c409e0", BASE/"tail1/backlog-server.ts"),
}
SEED_SOURCE = "46880aa47d7c580c400b457df0c8baf9e971e78a"


def build(item, repo):
    pin, entry = PRODUCERS[item]
    original = (repo/entry).read_bytes()
    assert subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=repo, text=True).strip() == pin
    assert subprocess.check_output(["git", "show", f"{pin}:{entry}"], cwd=repo) == original
    text = original.decode()

    def replace(before, after):
        nonlocal text
        assert text.count(before) == 1, before
        text = text.replace(before, after)

    if item.startswith("jvm25"):
        replace('for (let i = 0; i < 60; i++) {', 'for (let i = 0; i < (process.env.BM1_JVM25_SMALL ? 2 : 60); i++) {')
        replace('    for (const window of fieldPlan()) {', '''    const small = process.env.BM1_JVM25_SMALL;
    const windows = small ? fieldPlan().slice(0, 1).map((w) => ({ ...w, schedule: w.schedule.slice(0, 8) })) : fieldPlan();
    for (const window of windows) {''')
        replace('    const summary = validateArm(raw, "individual", "rates", seed.nonce);',
                '    const summary = small ? [{ label: phases[0]!.label, offered: phases[0]!.offered }] : validateArm(raw, "individual", "rates", seed.nonce);')
        replace('  for (const name of part2 ? part2Arms.slice(0, coreOnly ? 3 : 4) : serverArms) {', '''  // [DX-BM1] Why: admit the memory-matched fourth arm only after the first three finish on time.
  // Rejected: restarting the three already measured policies or sampling the fourth before checking the wall clock.
  const small = process.env.BM1_JVM25_SMALL;
  const campaignStart = Date.now();
  const names = part2 ? part2Arms.slice(0, small ? 1 : coreOnly ? 3 : 4) : serverArms;
  for (const name of names) {
    if (name === part2Arms[3] && Date.now() - campaignStart >= 80 * 60_000) break;''')
        replace('reads: await Promise.all(fieldPlan().map(async ({ label }) => {',
                'reads: await Promise.all((small ? fieldPlan().slice(0, 1) : fieldPlan()).map(async ({ label }) => {')
        replace('assert.equal(data.samples.length, 60);','assert.equal(data.samples.length, small ? 2 : 60);')
    else:
        replace('import { execFileSync, spawn }', 'import { execFileSync, spawn, spawnSync }')
        replace('  assert.equal(execFileSync("systemd-detect-virt", { encoding: "utf8" }).trim(), "none");', '''  const virt = spawnSync("systemd-detect-virt", [], { encoding: "utf8", timeout: 5000 });
  assert(virt.status === 1 && virt.stdout.trim() === "none", "Physical host required");''')
        replace('  execFileSync("git", ["merge-base", "--is-ancestor", seed.source, head]);', f'''  // [DX-BM1] Why: accept the specifically authorized, separately pinned JVM1 seed from its sibling branch.
  // Rejected: changing the receipt's provenance or accepting unverified cross-branch seed inputs.
  if (seed.source !== "{SEED_SOURCE}") execFileSync("git", ["merge-base", "--is-ancestor", seed.source, head]);''')
        replace('    const { label, schedule } = windows[0];',
                '    const { label } = windows[0];\n    const schedule = process.env.BM1_TAIL_SMALL ? windows[0].schedule.slice(0, 8) : windows[0].schedule;')
        replace('schedule.length === 2364,','schedule.length === (process.env.BM1_TAIL_SMALL ? 8 : 2364),')
        if item == "tail-backlog-generation":
            replace('          await runWorker(dir, policy.cpus.sender, env, deadline - Date.now() - 60_000);',
                    '''          await runWorker(dir, policy.cpus.sender, env, deadline - Date.now() - 60_000);
          // [DX-BM1] Why: capture two WAL counter samples in the short gate outside its offers.
          // Rejected: bypassing the collector's bracket or adding traffic to the measured phase.
          if (process.env.BM1_TAIL_SMALL) await new Promise((resolve) => setTimeout(resolve, 5500));''')
    shared_sha = None
    if item in ("jvm25-retry", "tail-backlog-integrated", "tail-backlog-generation"):
        if item.startswith("jvm25"):
            replace('"../w1/bench.ts"','"../w1/.bm1-n20-bench.ts"')
        else:
            replace('"../w1/bench.ts"','"../w1/.bm1-n20-bench.ts"')
            exact = PRODUCERS["tail-backlog"][0]
            assert original == subprocess.check_output(["git","show",f"{exact}:{entry}"],cwd=repo)
        w1 = BASE/"w1/bench.ts"
        original_w1=(repo/w1).read_bytes()
        assert original_w1==subprocess.check_output(["git","show",f"{pin}:{w1}"],cwd=repo)
        old='TRIPLEX_NODE_WORKER_CPUS: p.cpus.sender,'
        assert original_w1.count(old.encode())==1
        # [DX-BM1] Why: keep the three declared sender CPUs while assigning the main core exclusively.
        # Rejected: ignoring affinity verification or borrowing a JVM core for Node helpers.
        tuned = original_w1.replace(old.encode(),b'TRIPLEX_NODE_WORKER_CPUS: p.cpus.sender.split(",").slice(1).join(","),')
        with (repo/w1.with_name(".bm1-n20-bench.ts")).open("xb") as stream:
            stream.write(tuned)
        shared_sha=hashlib.sha256(tuned).hexdigest()
    target = repo/entry.with_name(".bm1-n20-"+entry.name)
    with target.open("x") as stream:
        stream.write(text)
    return {"source": pin, "original": hashlib.sha256(original).hexdigest(),
            "adapted": hashlib.sha256(target.read_bytes()).hexdigest(), "entry": str(target), "sharedStackSha256":shared_sha}


if __name__ == "__main__":
    item, repo = sys.argv[1:]
    print(json.dumps(build(item, Path(repo).resolve()), indent=2))
