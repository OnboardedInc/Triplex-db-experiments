"""Lossless stdlib-only verifier/restorer for the evidence package, not app code."""
from pathlib import Path, PurePosixPath
import argparse
import hashlib
import json
import re
import stat
import tarfile

SHA = lambda b: hashlib.sha256(b).hexdigest()


def unique_object(pairs):
    result = {}
    for k, v in pairs:
        if k in result:
            raise ValueError('duplicate metadata key')
        result[k] = v
    return result


def safe_name(name):
    p = PurePosixPath(name)
    if p.is_absolute() or not p.parts or any(x in ('', '.', '..') for x in p.parts) or '\\' in name:
        raise ValueError('unsafe archive/logical path')
    if str(p) != name:
        raise ValueError('noncanonical archive/logical path')
    return p


def restore(archive, destination):
    if destination.exists() or destination.is_symlink():
        raise ValueError('destination must not exist; never overwrite a prior restore')
    raw_members, modes = {}, {}
    with tarfile.open(archive, 'r:gz') as tar:
        for member in tar:
            safe_name(member.name)
            if member.name in raw_members or not member.isfile():
                raise ValueError('duplicate/nonregular archive member')
            if member.uid != 0 or member.gid != 0 or member.mtime != 0 or member.mode & ~0o777:
                raise ValueError('unexpected deterministic member metadata')
            body = tar.extractfile(member).read()
            if len(body) != member.size:
                raise ValueError('incomplete archive member')
            raw_members[member.name] = body
            modes[member.name] = member.mode
    required = {'README.md', 'restore_bundle.py', 'EVIDENCE-MANIFEST.json', 'EXCLUSIONS.json'}
    if not required <= raw_members.keys():
        raise ValueError('missing package metadata')
    manifest = json.loads(raw_members['EVIDENCE-MANIFEST.json'], object_pairs_hook=unique_object)
    if manifest['format'] != 'td.goal3.closed-text-evidence/1':
        raise ValueError('wrong manifest schema')
    aliases = {r['alias'] for r in manifest['root_aliases']}
    expected_paths, expected_payloads = {}, set()
    for entry in manifest['files']:
        path = safe_name(entry['path'])
        if path.parts[0] not in aliases or entry['path'] in expected_paths:
            raise ValueError('unknown/duplicate logical path')
        digest = entry['sha256']
        if re.fullmatch('[0-9a-f]{64}', digest) is None:
            raise ValueError('invalid payload hash')
        blob = 'payloads/' + digest
        if blob not in raw_members or SHA(raw_members[blob]) != digest or len(raw_members[blob]) != entry['bytes']:
            raise ValueError('logical payload bytes/hash mismatch')
        mode = int(entry['mode'], 8)
        if mode & ~0o777:
            raise ValueError('unsafe logical mode')
        expected_paths[entry['path']] = entry
        expected_payloads.add(blob)
    if set(raw_members) != required | expected_payloads:
        raise ValueError('missing or unindexed archive member')
    for name in expected_payloads:
        if SHA(raw_members[name]) != name.split('/')[1] or modes[name] != 0o444:
            raise ValueError('bad blob identity/mode')
    for name in required:
        if modes[name] != 0o644:
            raise ValueError('bad metadata member mode')
    # No tar extraction API: write only validated names into a new destination.
    destination.mkdir(parents=True)
    for name, body in raw_members.items():
        p = destination / 'archive-members' / name
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(body)
        p.chmod(modes[name])
    for name, entry in expected_paths.items():
        p = destination / 'evidence' / name
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(raw_members['payloads/' + entry['sha256']])
        p.chmod(int(entry['mode'], 8))
    member_files = {str(p.relative_to(destination / 'archive-members')): p
                    for p in (destination / 'archive-members').rglob('*') if p.is_file()}
    logical_files = {str(p.relative_to(destination / 'evidence')): p
                     for p in (destination / 'evidence').rglob('*') if p.is_file()}
    if set(member_files) != set(raw_members) or set(logical_files) != set(expected_paths):
        raise ValueError('restored pathset mismatch')
    for name, p in member_files.items():
        if p.is_symlink() or p.read_bytes() != raw_members[name] or stat.S_IMODE(p.stat().st_mode) != modes[name]:
            raise ValueError('restored archive member bytes/mode mismatch')
    for name, p in logical_files.items():
        entry = expected_paths[name]
        body = p.read_bytes()
        if (p.is_symlink() or len(body) != entry['bytes'] or SHA(body) != entry['sha256']
                or stat.S_IMODE(p.stat().st_mode) != int(entry['mode'], 8)):
            raise ValueError('restored logical file bytes/hash/mode mismatch')
    return {'status':'PASS_ALL_MEMBERS_AND_LOGICAL_FILES_RESTORED',
            'archive_sha256':SHA(archive.read_bytes()),
            'archive_members':len(raw_members),'logical_files':len(expected_paths),
            'logical_bytes':sum(x['bytes'] for x in expected_paths.values()),
            'unique_payloads':len(expected_payloads),
            'evidence_manifest_sha256':SHA(raw_members['EVIDENCE-MANIFEST.json']),
            'archive_pathset_bytes_hashes_modes':'all verified',
            'logical_pathset_bytes_hashes_modes':'all verified',
            'raw_bytes_repaired_or_normalized':False,
            'application_code_imported_or_executed':False}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--archive', required=True, type=Path)
    parser.add_argument('--dest', required=True, type=Path)
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    result = restore(args.archive, args.dest)
    text = json.dumps(result, indent=2) + '\n'
    if args.report:
        args.report.write_text(text)
    print(text, end='')
