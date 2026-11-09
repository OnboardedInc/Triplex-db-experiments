# Sam's decisions, 2026-11-09 (verbatim, then what each means)

Sam, in chat, 2026-11-09, verbatim:

> Yes to everything you recommended. If you have to turn off my onboarded stack or anything, I'm not going to be running that, so that's
> fine to turn it off. You can use my whole Mac and close down anything heavy that's running here that's not needed. Don't turn off
> Claude or Codex, though.
>
> Otherwise, yes, I will let you know if I have to use my machine. Otherwise, I'm not using it. Use more of the Claude usage now instead
> of a lot of Codex. Switch to using Sonnet on high to write stuff instead of the Codex stuff. That's the switch to make.
>
> You can put those down in your protocol and continue. It's fine if you put it in a smaller thing as you need. If you need to run one at
> a time to get more space, you can do that too. As you do that, also tell me how much disk space would be good to get back, and I can try
> to find a way to reclaim that for you so you can test larger datasets.

## What "everything you recommended" approves (the recommendations as given to Sam the same day)

| Pending item | Approved as |
| --- | --- |
| Q99-S1, the NS rung | NS acceptance and calibration at the largest W0 rung each composition fits on one exclusive slot within the 50 GiB pool disk limit; year-one reported as a projection, never a pass; NS.P5's scoped release stays at 100k |
| Q94a, the GS rung | The same rule for the 20 golden scenarios |
| Q100-S1 (Q60's host half), quiet windows | Acceptance windows may pause Sam's default colima VM (his Onboarded stack) and other heavy host jobs, announced in STATE; Claude and Codex are never turned off. Sam: "You can use my whole Mac" |
| Q98j, lane X P3/P2 arms | XTDB behind the broker counts as lane X's candidate; the native arm is reported beside it |
| Q95-S, erasure S1-S4 | R38's recommendations: S1 option A, S2 accepted with R = 15 min, S3 option A, S4 option A. Counsel must confirm GDPR Article 17 before Triplex calls crypto-shredding compliant |
| Q89g, public position token | An opaque position token added to the public TemporalBasis (R33) |
| Q78e, lane D tenancy | Tiered tenant isolation (R32); dev storage stays diagnostic only (Q88a) |
| Q86g, VM hardening | H1 (narrow the triplex2 VM's mounts from writable $HOME) and H2 (block outbound traffic from tx2 containers to Mac services, including ports 15442 and 17019) |
| Pre-commit hook | Install a git pre-commit hook that runs build_contract.py --verify on commits that touch lab/acceptance |

Not decided (no recommendation was made): whether P1 needs a p99.9 or max read bar so reads cannot bunch within 100 ms.

## Operating changes

1. **Builders are Claude Sonnet 5.5 at high effort** (Agent tool), replacing Codex medium. Reviewers stay Codex gpt-6.1-sol at high; planners
   and researchers stay Opus 5.5 at high. Nothing above high. Codex builder sessions already running finish their current task.
2. **The whole Mac is available:** heavy processes that are not needed may be stopped, never Claude or Codex. Sam will say when he needs
   the machine.
3. **Smaller or sequential runs are fine** when disk or memory requires it.
4. **Sam asks how much disk to reclaim** so larger datasets can be tested; the answer goes in chat and STATE.

## 2026-11-09, later: bpftrace image download

Sam, verbatim, answering "May I download the pinned Ubuntu bpftrace image (about 90 MB) into the triplex2 VM?":

> Yes, download it

Scope of the approval: one local image built inside the triplex2 VM from ubuntu:24.04 (arm64 digest
19cad59657037cffa0ac9a48107019b768900ff1071140965827513ac866bd5e) plus the R49-pinned Ubuntu archive packages (bpftrace
0.20.2-1ubuntu4.3, LLVM 18 1:18.1.3-1ubuntu1, libbpfcc 0.29.1+ds-1ubuntu7 and their dependencies), about 90 MB. Nothing on the Mac host.
