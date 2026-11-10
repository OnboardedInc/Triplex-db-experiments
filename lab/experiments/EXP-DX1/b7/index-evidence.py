# [DX-B7-S4] Why: bind every retained byte without committing bulky raw captures or multi-megabyte recursive manifests.
# Rejected: a chat-only path list, source hashes without preimages, or fingerprints of files still being written.
import hashlib,pathlib
root=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B7')
repo=pathlib.Path('lab/experiments/EXP-DX1/b7')
def sha(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        while block:=f.read(1024*1024):h.update(block)
    return h.hexdigest()
rows=[];count=0;total=0
for p in sorted(root.iterdir()):
    if p.is_dir():
        manifest=p/'DX-B7-FINAL-SHA256SUMS'
        assert not manifest.exists(),manifest
        files=sorted(x for x in p.rglob('*') if x.is_file())
        with manifest.open('x') as f:
            for x in files:
                f.write(f'{sha(x)}  {x.relative_to(p)}\n');count+=1;total+=x.stat().st_size
        rows.append((sha(manifest),str(manifest.relative_to(root))))
    elif p.is_file():
        rows.append((sha(p),p.name));count+=1;total+=p.stat().st_size
(repo/'SHA256SUMS').write_text(''.join(f'{h}  {p}\n' for h,p in rows))
assert (repo/'SHA256SUMS').stat().st_size<1000000
(repo/'EVIDENCE.md').write_text(f'''# DX-B7 evidence index

Durable root: `{root}/`.

The committed [SHA256SUMS](SHA256SUMS) binds {len(rows)} root files or directory manifests, covering {count} retained files
({total:,} bytes before the directory manifests). Each immediate subdirectory has a `DX-B7-FINAL-SHA256SUMS` that binds every
file beneath it. This keeps bulky recursive inventories outside git. Check the root list from the durable root, then each
subdirectory's manifest from that directory. Checksums bind bytes; they do not certify answers.

- `tx2-dxb7-baseline-b*`: unchanged gateway profile, raw driver samples and partial harness/input binding described in REPORT.md.
- `tx2-dxb7-step1-pull-a*`, `step2-pull-a*`, `step3-pull-a*`: successive source/build captures, raw measurements and JFRs.
- `tx2-dxb7-step4-pull-c*`: final four-worker frozen matrix, writer/feed samples, exact seed request/ACK transcript and frozen basis;
  before/after helper inventories, owned identities/cgroups, JFR/events/profile summaries, empty-resource cleanup receipt.
- `step1-gate-union.json` through `step3-gate-union.json`: complete earlier gate unions, distinct from failed enclosing attempts. No final step-4 union is claimed.
- `tx2-dxb7-step4-legacy-a*`: completed final legacy and Clojure tests. Final lean-b was cancelled before admission; the final
  300-case verifier differential was not started. `BUDGET-CANCELLATION.json` records the explicit queued-job cancellation.
- `final-profile-callers.json`: retained stack examples, with caller attribution limits. The additional thread-name extraction was
  cancelled in the heavy queue; its zero-byte output is not a profile result.
- Earlier `*-a/b/c*` failures, timeouts, cancelled queued probes and helper-preflight failures remain. No failed attempt was removed.

No root-wide evidence directory was copied into git. No acceptance promotion, independent review, merge, push or deployment is implied.
''')
print(f'Indexed {count} files / {total} bytes in {len(rows)} entries')
