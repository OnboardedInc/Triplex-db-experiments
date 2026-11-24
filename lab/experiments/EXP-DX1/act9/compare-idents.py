"""[DX-ACT9, from DX-S3] Compare two s3/idents.sh outputs setting by setting.
usage: python3 -I compare-idents.py <before.jsonl> <after.jsonl>
Every identity and code hash present before must be equal after, in every setting. Keys only in the after tree are
listed (new stored functions); with the option off ("several" settings excluded) there must be none that differ.
Exit 1 if any key present in both differs, or if a key present before is missing after."""
import json
import sys

before = {r["setting"]: r["idents"] for r in map(json.loads, open(sys.argv[1]))}
after = {r["setting"]: r["idents"] for r in map(json.loads, open(sys.argv[2]))}
bad = 0
for setting, old in before.items():
    new = after.get(setting, {})
    differ = sorted(k for k in old if k in new and old[k] != new[k])
    missing = sorted(k for k in old if k not in new)
    added = sorted(k for k in new if k not in old)
    changed_values = sorted({new[k] for k in added} - set(old.values()))
    print(f"{setting}: {len(old)} before, {len(new)} after; equal {len(old) - len(differ) - len(missing)}; "
          f"differ {len(differ)}; missing {len(missing)}; new keys {len(added)}")
    for k in differ:
        print(f"  DIFFER {k}: {old[k]} -> {new[k]}")
    for k in missing:
        print(f"  MISSING {k}")
    for k in added:
        print(f"  NEW {k}: {new[k]}")
    bad += len(differ) + len(missing)
    subject_ident = new.get("triplex.gateway.subject-save/ident")
    print(f"  one-owner function: {old.get('triplex.gateway.subject-save/ident')} -> {subject_ident}")
print("DX-S3_IDENTS_COMPARE", "equal" if bad == 0 else f"{bad} differences")
sys.exit(1 if bad else 0)
