#!/usr/bin/env python3
"""Create one historical variant in a new destination. Never overwrite files."""
import argparse, hashlib, json, os
from pathlib import Path, PurePosixPath
ROOT=Path(__file__).resolve().parents[1]

def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument("variant",nargs="?");ap.add_argument("destination",nargs="?",type=Path);ap.add_argument("--list",action="store_true");ap.add_argument("--build-text",action="store_true",help="Materialize archival text-only build snapshot instead of a source variant");a=ap.parse_args()
    manifests=ROOT/("duckdb-temporal/build-text-manifests" if a.build_text else "duckdb-temporal/variant-manifests")
    if a.list:
        for p in sorted(manifests.glob("*.json")): print(p.stem)
        return
    if not a.variant or not a.destination: ap.error("variant and destination required")
    if Path(a.variant).name!=a.variant: ap.error("invalid variant name")
    dest=a.destination.absolute()
    if dest.exists() or dest.is_symlink(): ap.error("destination must not exist")
    for parent in dest.parents:
        if parent.is_symlink(): ap.error("destination has symlink ancestor")
    manifest=json.loads((manifests/(a.variant+".json")).read_text())
    objects=ROOT/("duckdb-temporal/build-text-objects" if a.build_text else "duckdb-temporal/variant-objects")
    for name, row in manifest["files"].items():
        p=PurePosixPath(name);h=row["sha256"]
        if p.is_absolute() or ".." in p.parts or "\\" in name or str(p)!=name: ap.error("unsafe member")
        if len(h)!=64 or any(c not in "0123456789abcdef" for c in h): ap.error("invalid object key")
        obj=objects/h
        if obj.is_symlink() or not obj.is_file(): ap.error("missing or symlink object")
        b=obj.read_bytes()
        if len(b)!=row["bytes"] or hashlib.sha256(b).hexdigest()!=h: ap.error("object integrity failure")
    dest.mkdir(parents=False,exist_ok=False)
    for name,row in manifest["files"].items():
        p=dest/name;p.parent.mkdir(parents=True,exist_ok=True)
        with p.open("xb") as out: out.write((objects/row["sha256"]).read_bytes())
        p.chmod(0o755 if row.get("executable") else 0o644)
    print(json.dumps({"result":"MATERIALIZED","variant":a.variant,"files":len(manifest["files"]),"scope":"Sanitized source variant; shared decoded artifacts remain in the handoff. No build or tests executed."}))

if __name__=="__main__": main()
