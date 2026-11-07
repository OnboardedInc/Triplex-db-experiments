# Focused UID/user-namespace review — item 4

2026-10-31 UTC. **Research and proposal review only. No proposed control preflight or true-target invocation was performed; all project/compiler/runtime gates stay closed.** Only this disjoint directory is written. The original research freeze `3327647d…` remains unchanged. No old goal3/stopped material was consulted.

## Decision

1. **Cannot establish the proposed NPROC no-exception/no-new-child premise.** Namespace-visible UID 1000, zero capability sets and NoNewPrivs=1 do not exclude the independent kernel INIT_USER exception.
2. **A separately reviewed setter/readback/harmless-exec observation is a coherent, much narrower claim.** It does not prove enforcement or a future no-child property.
3. **A namespace-visible UID 0 executable owner is not a necessary Linux exec/NPROC prerequisite.** Under the stated trusted-platform/file-identity premise, reject that invented numeric-owner prerequisite—not the remaining safety checks.
4. **As written, the proposal needs revision.** If the intended authorization still requires ordinary kernel-nonroot/no-exception or enforcement, abort before controls/target. Do not silently drop that condition or reinterpret approval.

## Evidence actually reviewed

INPUT-001, 18:34:27.652–18:34:27.973 UTC, chunk d2311b, read only:

- `goal4-control-preflight/identity-review-001/IDENTITIES.json`, SHA256 `5e4a83a2996f28726d5d030bfcfb6ff6b3df5f62e054691b115db9c34d93652b`.
- `goal4-execution-gate-proposal/revision-001/PROPOSAL.md`, SHA256 `5ada6596506bb3380cfe7c820860e5510515b9ab3a7b291e9e907f520fd69a32`.

The identity input is a prior observation at **18:32:32 UTC**, not a new identity or permission experiment here. It records visible UID/EUID/GID/EGID 1000, all capability sets zero, NoNewPrivs=1, Seccomp=2; own UID/GID maps each contain exactly `1000 0 1`. It reports target/bash owner 65534, mode 0755, no setid, effective non-writability of both files and every listed ancestor in the current root. Its earlier UID 0 assertion failed before writes/controls/target, not as a tool-denial result.

## Exact primary kernel chain

Code citations below use maintainer Linux **v6.18.55**, immutable commit `725bd2f3c81d54edccb66fead01d4c0c222e2231`. Corresponding v6.18 source was independently pinned to `7d0a66e4bb9081d75c82ec4957c50034cb0ea449`; identities/ranges are in EXACT-CITATIONS.json. These upstream identities do not attest the running kernel binary or absence of vendor patches.

- In `copy_process`, an over-limit NPROC count causes this rejection only if the child's real-credential user is **not INIT_USER**, **and** both capability checks fail. This root-user exemption is separate from capability bits. [fork.c:2058–2063](https://github.com/gregkh/linux/blob/725bd2f3c81d54edccb66fead01d4c0c222e2231/kernel/fork.c#L2058-L2063).
- INIT_USER means the root_user object. That object is indexed by GLOBAL_ROOT_UID; the latter is kernel-internal UID zero. The user cache compares internal UIDs, not displayed namespace labels. [sched/user.h:44–45](https://github.com/gregkh/linux/blob/725bd2f3c81d54edccb66fead01d4c0c222e2231/include/linux/sched/user.h#L44-L45), [user.c:113–117,132–140](https://github.com/gregkh/linux/blob/725bd2f3c81d54edccb66fead01d4c0c222e2231/kernel/user.c#L113-L140), [uidgid.h:47](https://github.com/gregkh/linux/blob/725bd2f3c81d54edccb66fead01d4c0c222e2231/include/linux/uidgid.h#L47).
- `capable` checks the initial user namespace. Zero capability bits do not answer the separate root_user-pointer question. NoNewPrivs restricts privilege gains across exec; it does not erase an existing internal UID. [capability.c:414–417](https://github.com/gregkh/linux/blob/725bd2f3c81d54edccb66fead01d4c0c222e2231/kernel/capability.c#L414-L417), [kernel No New Privileges documentation](https://docs.kernel.org/userspace-api/no_new_privs.html).
- Credential copying preserves the user reference and accounts the new task; ucounts walks namespace-associated counters/limits. A counter being over-limit does not bypass the later exemption branch. [cred.c:206–239,290–345](https://github.com/gregkh/linux/blob/725bd2f3c81d54edccb66fead01d4c0c222e2231/kernel/cred.c#L206-L345), [ucount.c:247–260,328–340](https://github.com/gregkh/linux/blob/725bd2f3c81d54edccb66fead01d4c0c222e2231/kernel/ucount.c#L247-L340).

The manual's “real UID 0” exception must not be interpreted as only the visible getuid() numeral in an arbitrary namespace. The exact kernel branch resolves this ambiguity. [getrlimit(2)](https://man7.org/linux/man-pages/man2/getrlimit.2.html).

## What the UID map does—and does not—show

For an own-namespace opener of its own uid_map, column two is **immediate-parent relative**. The implementation explicitly chooses the parent when opener and target namespaces match. Thus `1000 0 1` maps current UID 1000 to parent UID 0; it does not reveal the rest of the ancestry. [user_namespaces(7), UID-map interpretation](https://man7.org/linux/man-pages/man7/user_namespaces.7.html), [user_namespace.c:613–630](https://github.com/gregkh/linux/blob/725bd2f3c81d54edccb66fead01d4c0c222e2231/kernel/user_namespace.c#L613-L630).

Illustrative compositions, **not observations**:

- current 1000 → parent 0, with parent initial: internal root is possible;
- current 1000 → parent 0 → initial 1000: internal nonroot is also possible.

The given evidence cannot distinguish those cases. The proc status UIDs are translated for the reader, not a raw internal-UID dump. The user-namespace creation helper's separate inherited-maximum logic does not remove the fork exemption. [array.c:187–194](https://github.com/gregkh/linux/blob/725bd2f3c81d54edccb66fead01d4c0c222e2231/fs/proc/array.c#L187-L194), [user_namespace.c:63–72,142–146](https://github.com/gregkh/linux/blob/725bd2f3c81d54edccb66fead01d4c0c222e2231/kernel/user_namespace.c#L63-L146).

**Required correction to the earlier narrow-process suggestion:** “ordinary non-root UID 1000” must not be inferred from displayed UID 1000 alone. Kernel-global identity/exception status remains unknown here. No ancestor-namespace inspection, privileged query, pointer probe or fork experiment was attempted.

## What a true-only control observation could honestly establish

If separately approved with the revised purpose, a successful exact action could record only:

1. the named setters returned success in that launch;
2. both soft/hard values read back as requested in the same shell;
3. the reviewed shell exec-replacement and trusted harmless target completed with a terminal tool exit.

This is compatible with **NPROC enforcement being bypassed**. `do_prlimit` validates/stores resource-limit values independently of the fork decision; success/readback is not a trial of a denial branch. [sys.c:1500–1538](https://github.com/gregkh/linux/blob/725bd2f3c81d54edccb66fead01d4c0c222e2231/kernel/sys.c#L1500-L1538).

It does **not** prove fork/clone/thread rejection, AS allocation failure, CPU-limit termination, a wall deadline, aggregate charged memory, reserved capacity, compiler feasibility or a property of any future launch/target. No child attempt or stress test is needed—or authorized—to make the limited metadata statement.

The reviewed artifact must be the **exact launch specification**, not this prose proposal: conventional command substitution, pipelines, parenthesized groups and background/process substitutions can create subshells even when the nested command is a builtin. Startup inputs, functions/traps and failure paths also matter. Exec's documented replacement semantics are structural, not an NPROC experiment. [GNU Bash manual: invocation, substitution, execution environment, exec](https://man7.org/linux/man-pages/man1/bash.1.html). The public true manual describes normal successful no-op behavior, not an attestation of the installed bytes or loader environment. [GNU true(1)](https://man7.org/linux/man-pages/man1/true.1.html).

## Ownership/root-path review

Displayed owner 65534 may be the overflow representation of an **unmapped** owner; it is not proof of actual “nobody” ownership. Stat/getuid report namespace-relative IDs. An owner 0 check therefore does not establish trusted installation or kernel-root identity. [user_namespaces(7), unmapped IDs](https://man7.org/linux/man-pages/man7/user_namespaces.7.html).

Linux's executable-open path requests execution access and checks noexec/type/write conflicts; it has no universal “owner must display as UID 0” prerequisite. [exec.c:765–803](https://github.com/gregkh/linux/blob/725bd2f3c81d54edccb66fead01d4c0c222e2231/fs/exec.c#L765-L803). Absolute names start at the process's current root, not a guessed host root. [path_resolution(7)](https://man7.org/linux/man-pages/man7/path_resolution.7.html).

**Review judgment:** given the explicitly trusted platform and recorded exact file identities, no setid/group-other writes, and effective non-writability through the current-root path, numerical UID 0 ownership adds no justified necessary condition for this harmless target selection. This does not certify provenance, all dependencies, durable immutability, other principals' access or resistance to check/use races. Permission-check snapshots are not an atomic future exec guarantee. [access(2), effective-ID checks and race warning](https://man7.org/linux/man-pages/man2/access.2.html).

The current root displaying owner 1000 does not override its observed effective non-writability; neither fact establishes the NPROC root-user exception. Treat the hashes/metadata as **identity evidence under a trust premise**, never a supply-chain attestation.

## Specific proposal review / abort boundary

- Requested-boundary text presently mentions a VM/CPU/no-new-child claim. Replace that intended outcome with setter/readback/true completion **only**, if that is what the parent deliberately wants to authorize.
- Step 1 can verify visible fields, but cannot verify “ordinary/no-exception” from them. If that remains required, **abort** rather than set controls.
- Keep fail-closed setters/readback, exact harmless target, terminal-state reconciliation, no fallback/retry, and all stronger/project gates unchanged.
- Label NPROC as a stored value, not demonstrated enforcement. Label AS/CPU as requested/read-back settings, not exercised enforcement.
- A new label is not retroactive approval. The exact revised action/conditions require coordinator review within the parent's authorization; this review neither edits the proposal nor executes it.

## Remaining unknowns and freeze

Unknown: ultimate internal UID/INIT_USER status, full namespace ancestry and ucounts maxima, active filter details and setter outcome, exact future launch text/environment, target completion, current file identities after the input snapshot, and running-kernel correspondence to upstream. No inference from owner labels fills those gaps.

READ-CALLS.json records before/after UTC and available correlation/chunk IDs. SOURCE-INVENTORY.md and EXACT-CITATIONS.json separate authoritative connector-pinned code from preliminary web-rendered offsets/fetch failures. FROZEN-MANIFEST.sha256 freezes only this new report/evidence corpus; its verification receipt is a later annex. **No controls, harmless target or project execution occurred in this review.**

