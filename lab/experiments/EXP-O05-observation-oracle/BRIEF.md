# EXP-O05 brief: build O-OBS, the observation oracle (lab/acceptance/oracle/observe.py)

## North star
The floor under P1, P2, P3 and P5 claims: contract 0.3.10 lists O-OBS as TO-BUILD, and its absence blocks 62 of 157 obligations, more
than any other blocker (it holds NS.P3, NS.P5 and GS.01-GS.20 together with O-HAND). Read lab/NORTH-STAR.md first.

## Commander's intent
O-OBS turns retained engine-side evidence into a verdict per protocol, so that "reads never wrote", "connections were released",
"no read was served by an ineligible index" and the rest are decided by an independent program, never by the client's own counters or by
the system under test. Build it so that it fails closed: missing evidence, client-side counters offered as engine evidence, or a malformed
record is a FAIL or a typed refusal, never a PASS. A PASS must be impossible to obtain by supplying the label without the substance (the
attack Codex has found in every round of this lab: lab/reviews/plan-v2-round8.codex.md).

## Read
- lab/acceptance/ACCEPTANCE.md section 6.3 (the 14 OBS-* protocols, their evidence fields and verdict rules), the O-OBS row of the oracle
  table (about line 995), CR-OBSERVE, and every obligation that names O-OBS in lab/acceptance/obligations.json (with its thresholds, the
  T-* names, and its entrypoints such as EP-ENGINE-OBS).
- lab/acceptance/RULINGS.md for any ruling that mentions O-OBS, OBS-*, observation, counterSource or engine-side evidence.
- lab/oracles/replay/ (O-REPLAY) and lab/oracles/domain/ (O-DOMAIN) as examples of how lab oracles are laid out, tested and self-checked.
  O-OBS is needed for OBS-SCALE-COUNT, which compares with O-REPLAY's analytic count: call O-REPLAY as a separate process, never import it.

## Work
1. `lab/acceptance/oracle/observe.py`, Python stdlib only, run as `python3 -I`: `observe.py check <protocol> <evidence.json>` prints a
   canonical JSON verdict {protocol, verdict: PASS | FAIL | REFUSED, reasons[], thresholds used}; exit 0 PASS, 1 FAIL, 2 malformed input.
2. Evidence schema per protocol exactly as section 6.3 names the fields; unknown fields are kept but ignored; missing required fields fail
   closed. Where a protocol says the evidence must be engine-side (`counterSource`, `source`, engine samples), define the accepted source
   kinds from the contract and reject client-side ones.
3. Thresholds come from obligations.json by name (T-CONN-RELEASE-MS, T-AVAIL-WINDOW-MS, T-PLANNER-MEM-BYTES and the rest), read from the
   contract file passed with `--contract`, never from the evidence file.
4. Tests and a self-check: for every protocol at least one PASS fixture and three FAIL fixtures built from its own rule (a boundary case, a
   missing field, a forged source), plus planted mutants of observe.py that the self-check must catch. Fixtures are hand-built from the
   contract text, not captured from any engine run.
5. A README with the evidence formats, the source kinds accepted per protocol, and anything section 6.3 leaves undecided, listed as
   CONTRACT-AMBIGUITY items with a proposed reading.

## Limits
- Work in your own worktree: `git -C /Users/sam/projects/triplex-db-2 worktree add /Users/sam/projects/triplex-db-2/.claude/worktrees/o05
  -b exp/O05-observation-oracle main`. Change only lab/acceptance/oracle/** and lab/experiments/EXP-O05-observation-oracle/**.
- Do not read packages/** or any lane adapter: O-OBS must be independent of the systems it judges. No Docker or engines.
- Do not edit build_contract.py, obligations.json, ACCEPTANCE.md or RULINGS files; pinning O-OBS is a later contract version's job.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Do not spawn subagents. Never send the user's email or
  personal details anywhere.

## Return
Branch head; per protocol the rule as implemented (file:line), fixture counts and self-check results; the accepted source kinds; the
CONTRACT-AMBIGUITY list; sha256 of every file.
