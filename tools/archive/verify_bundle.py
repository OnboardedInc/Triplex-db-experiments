#!/usr/bin/env python3
"""Verify exact exported bytes, safe ZIP names and absence of symlinks. No writes."""
import argparse, hashlib, json, stat, struct, sys, zipfile
from pathlib import Path, PurePosixPath

def safe(name):
    p = PurePosixPath(name)
    return bool(name) and not p.is_absolute() and ".." not in p.parts and "\\" not in name and "\x00" not in name and str(p) == name and not name.startswith("~")

def allowed_extra(info):
    # This fixed export needs only the required ZIP64 header-offset extension.
    # Do not accept timestamp, UID/GID, comments or arbitrary extra metadata.
    extra=info.extra
    return not extra or (len(extra)==12 and struct.unpack("<HH",extra[:4])==(1,8) and struct.unpack("<Q",extra[4:])[0]==info.header_offset and info.header_offset>=zipfile.ZIP64_LIMIT)

def digest(stream):
    h=hashlib.sha256()
    for b in iter(lambda:stream.read(1024*1024),b""): h.update(b)
    return h.hexdigest()

def verify(root, archive=None):
    errors=[]
    if archive:
        z=zipfile.ZipFile(archive); entries={}
        if z.comment: errors.append("unexpected-archive-comment")
        seen=set()
        for i in z.infolist():
            if i.filename in seen: errors.append("duplicate-archive-entry")
            seen.add(i.filename)
            mode=stat.S_IFMT(i.external_attr>>16)
            if mode not in (0,stat.S_IFREG,stat.S_IFDIR): errors.append("symlink-or-special-member")
            if i.is_dir():
                name=i.filename.rstrip("/")
                if not safe(name) or not (name=="temporal-store-handoff" or name.startswith("temporal-store-handoff/")): errors.append("unsafe-directory-or-root")
                if not allowed_extra(i) or i.comment: errors.append("unexpected-directory-metadata")
                continue
            if not i.filename.startswith("temporal-store-handoff/"):
                errors.append("unexpected-archive-root"); continue
            name=i.filename[len("temporal-store-handoff/"):]
            if not safe(name) or name in entries: errors.append("unsafe-or-duplicate-member"); continue
            if stat.S_ISLNK(i.external_attr>>16): errors.append("symlink-member")
            if not allowed_extra(i) or i.comment: errors.append("unexpected-member-metadata:"+name)
            entries[name]=i
        manifest=json.loads(z.read(entries["MANIFEST.json"]))
        actual=set(entries)-{"MANIFEST.json"}
        def read(name): return z.open(entries[name])
        def size(name): return entries[name].file_size
    else:
        if root.is_symlink(): raise ValueError("Root is a symlink")
        manifest=json.loads((root/"MANIFEST.json").read_text())
        actual=set()
        for p in root.rglob("*"):
            if p.is_symlink(): errors.append("symlink-in-tree"); continue
            if p.is_file(): actual.add(p.relative_to(root).as_posix())
        actual.discard("MANIFEST.json")
        def read(name): return (root/name).open("rb")
        def size(name): return (root/name).stat().st_size
    expected=manifest["files"]
    if manifest.get("format")!="temporal-store-sanitized-export/1": errors.append("manifest-format")
    if any(not safe(n) for n in expected): raise ValueError("Unsafe manifest path")
    errors.extend("missing:"+n for n in sorted(set(expected)-actual))
    errors.extend("extra:"+n for n in sorted(actual-set(expected)))
    for n in sorted(set(expected)&actual):
        with read(n) as inp: got=digest(inp)
        if got!=expected[n]["sha256"] or size(n)!=expected[n]["bytes"]: errors.append("changed:"+n)
    if archive: z.close()
    return {"format":"portable-export-integrity/1","result":"PASS" if not errors else "FAIL","files":len(expected),"bytes":sum(v["bytes"] for v in expected.values()),"scope":"Sanitized export bytes only; not original Git-origin audit, runtime correctness or a digital signature.","errors":errors[:30],"errorCount":len(errors)}

if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__);p.add_argument("--root",type=Path,default=Path(__file__).resolve().parents[1]);p.add_argument("--zip",type=Path);a=p.parse_args()
    try: result=verify(a.root,a.zip)
    except Exception as e: result={"result":"FAIL","error":type(e).__name__+": "+str(e)}
    print(json.dumps(result,indent=2));sys.exit(0 if result["result"]=="PASS" else 1)
