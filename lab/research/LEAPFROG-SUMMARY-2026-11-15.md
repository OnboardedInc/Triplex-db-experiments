# LEAPFROG summary: what to do next to pass P2 on Datomic (2026-11-15)

The full menu is `MENU.md` in this folder: 34 candidates, 9 more that need your decision, and builder briefs for the top five.

**Next action.** Say yes to pick 1 below. It takes one builder day, changes no product code and needs none of the questions
answered.

## What the saved records of the three quiet runs show

1. **The "256 readers" commit miss is not caused by readers.** The run with zero readers is just as slow in the same minutes
   of the test. A commit that follows a quiet gap of a quarter second costs 2.6 to 3.8 ms more than one that closely follows
   another commit. In that part of the test commits arrive one per second, so every one of them pays it. The cause is not
   known yet.
2. **About 1.0 to 1.1 ms of every measured commit is the test's own overhead.** Its timer starts each commit 0.6 to 0.7 ms
   late, and it stops the clock 0.4 ms after the acknowledgement.
3. **15 to 18 slow commits in every run are caused by the test itself.** Its history-growth step writes 500 subjects in one
   transaction, and live commits wait behind it. The p99 bar allows 74 slow commits (over 50 ms) per run.
4. **With readers running, the test writes its own files to the same virtual disk as the database.** Every database sync then
   pays for those writes too. Quiet periods hold 4 to 7 slow commits without readers and 12 to 37 with readers. This is the
   likely cause, and a two-hour test settles it.
5. **A commit on a warm path already costs 7.4 to 8.0 ms (5 to 10 facts) and 9.6 to 10.1 ms (11 to 25 facts).**

## The shortlist, ranked

| # | Pick | What it should move | Cost |
| --- | --- | --- | --- |
| 1 | Correct the test: start commits on time, record the acknowledgement time, write history growth in small commits | Every commit median down by 0.6 to 1.1 ms; 15 to 18 fewer slow commits per run | 1 day |
| 2 | Find what goes cold after a quiet gap, and keep it warm | The two 256-reader medians, by 2.6 to 3.8 ms | 4 to 6 hours to find it |
| 3 | Give the database a virtual disk of its own, and prepare Postgres's log files before the run | All-commit p99: 5 to 75 fewer slow commits in the run with readers | 6 to 8 hours |
| 4 | Turn Datomic's two Postgres commits per write into one | 0.5 to 0.8 ms per commit; half as many waits on the disk | 2-hour probe, then 2 days |
| 5 | Store fewer records per commit (each fact is written more than twice today) | Medium commits by 1.3 to 2.3 ms; storage at 100,000 subjects roughly halves | 1 day to price it, weeks to build |

**If picks 1 and 3 work as the records suggest,** P2 passes except the medium-commit median at 256 readers. Pick 2 closes that.

**The path to 100,000 subjects** starts with one real reading on today's stack that reports storage reads per commit (4
hours, needs disk space). Then remove what grows per commit, keep bulk writes behind live commits, and shrink the local copy.

## Questions for you

**These five decide the shortlist.**

1. **Keeping warm.** May the store keep its own commit path warm with background requests that write nothing, and still count
   as the product? If the cost of a quiet gap turns out to be the VM's disk path, may the test bench keep the disk awake, the
   way it keeps the CPUs awake today?
2. **Where the clock stops.** Is a commit finished when the receipt is handed to the caller? That is 0.4 ms earlier than
   where the test stops the clock today.
3. **Small samples.** Three bars are computed from 16 to 46 commits, and their answers change from run to run. May they be
   computed over at least 500 commits?
4. **Change records.** Each commit stores a copy of every changed fact as a "change" record. Is it enough that every Triplex
   query still returns those records, computed from what the commit stored, or must they be stored?
5. **Durability on this bench.** The VM's disk sync is best-effort and would not survive a power cut. Accept that as the
   standing test condition and report commits that hit a proven disk stall separately? Or require a full sync, which costs
   about 3 ms each on this Mac and makes pick 4 a precondition?

**These four can wait.**

6. **Disk.** Can the Mac get under 80% full or get an external SSD for the VM? Is the Linux machine available for one reading?
7. **Backdated record time in live scopes.** Recommendation: allow backdated valid time only.
8. **Split-read rule.** Recommendation: `pending`. It tests nearly the same number of cases without parking most readers.
9. **Activation.** Does the 100-second bar cover evaluation, with changed outputs published behind it in small paced commits?
