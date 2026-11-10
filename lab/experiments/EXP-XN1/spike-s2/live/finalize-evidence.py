#!/usr/bin/env python3
# [XN-S2-LIVE] Why: keep all bulky raw evidence external, then verify every indexed byte from disk after collection/cleanup. Rejected: committing jars or trusting a manifest without rereading its targets.
import datetime,hashlib,json,pathlib,shutil,subprocess
BASE=pathlib.Path(__file__).resolve().parent
ROOT=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/XN-S2')
if shutil.disk_usage(ROOT).free<5*1024**3:raise SystemExit('host disk floor; no fingerprint started')
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  while chunk:=f.read(1024*1024):h.update(chunk)
 return h.hexdigest()
files=sorted(f for f in (ROOT/'live').rglob('*') if f.is_file())
manifest=BASE.parent/'SHA256SUMS-live'
manifest.write_text(''.join(f'{sha(f)}  {f.relative_to(ROOT)}\n' for f in files))
verified=[]
for name in ['SHA256SUMS','SHA256SUMS-postgres','SHA256SUMS-live']:
 p=BASE.parent/name;total=0;count=0
 for line in p.read_text().splitlines():
  expected,relative=line.split('  ',1);f=(ROOT/relative).resolve()
  assert f.is_relative_to(ROOT) and f.is_file(),relative
  assert sha(f)==expected,relative
  total+=f.stat().st_size;count+=1
 verified.append({'manifest':name,'sha256':sha(p),'files':count,'bytes':total})
receipt={'kind':'fresh manifest byte verification; no engine acceptance verdict','at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'scriptSha256':sha(pathlib.Path(__file__)),'root':str(ROOT),'verified':verified}
receipt_path=ROOT/'live-manifest-verification.json';receipt_path.write_text(json.dumps(receipt,indent=2)+'\n')
index=BASE.parent/'EVIDENCE.md';text=index.read_text();marker='## Kafka and shared-S3 continuation'
if marker in text:text=text[:text.index(marker)]
last=verified[-1]
text+=f'''{marker}

Subdirectory `live/`: **{last['files']:,} files, {last['bytes']:,} bytes**, covered by `SHA256SUMS-live` relative to the durable root. Manifest SHA256: `{last['sha256']}`. All earlier manifests were freshly reread and verified as well.

| Files | Meaning |
| --- | --- |
| `images.json`, `xtdb-aws.jar`, `aws-classes.json`, `extract-*` | Local supplied image IDs/sizes and actual shipped serializer/class inspection |
| `topology-2/`, `topology-audit-*.json` | Real shared Kafka/MinIO proof, stopped/restarted follower identity, exact changing values at both bases, S3 objects and leader/compactor metrics; independently recomputed observation audit |
| `control-commits-2/` | Retained history-postflight harness failure; no timing adopted |
| `control-commits-3/` | Corrected, freshly rechecked fixture and same-day Local commit/reader-contention controls |
| `control-reads-1/`, `control-reads-rest-1/` | Point-read controls, retained bulk timeout, and unattempted point/pinned cases resumed without rerunning complete cases |
| `q1-*/`, `lag-*/`, `reads-*/` | Executed matrices, when present; an empty or absent directory is not measurement evidence |
| Each window's `sources/`, `source.json`, `binding.json`, inspections, `driver/`, `commands.json`, `released.txt` | Source preimages/hashes, exact inputs/containers/cgroups, raw samples, count/byte postflights, actual commands and cleanup |
| `collection-*.json`, `collected.json` | Immutable collection attempts and final diagnostic recomputation; no engine PASS |
| `cleanup-*.json` | Final fresh task-prefix volume/container/network observations and volume removals |

Fresh verification receipt: `live-manifest-verification.json`, SHA256 `{sha(receipt_path)}`. It binds all three manifest hashes, file counts and the verifier's actual source hash. It is outside the `live/` manifest to avoid a self-referential hash.

```sh
node lab/bin/heavy.mjs --label XN-S2-final-evidence -- python3 lab/experiments/EXP-XN1/spike-s2/live/finalize-evidence.py
```

`REPORT.md` states the actual completed/missing cells and limitations; this index does not promote missing or partial stages.
'''
index.write_text(text)
print(json.dumps(receipt,indent=2))
