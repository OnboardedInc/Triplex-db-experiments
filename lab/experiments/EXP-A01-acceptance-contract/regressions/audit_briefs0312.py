"""Audit instruction preimages separately from verdict records; optionally recheck launcher originals."""
import argparse
import hashlib
import json
from pathlib import Path
import runpy
import subprocess

REPO = Path(__file__).resolve().parents[4]
D = runpy.run_path(str(REPO / 'lab/acceptance/build_contract.py'))


def git_bytes(ref, path):
    result = subprocess.run(['git', 'show', f'{ref}:{path}'], cwd=REPO, capture_output=True)
    return result.stdout if result.returncode == 0 else None


def digest(data):
    return hashlib.sha256(data).hexdigest()


parser = argparse.ArgumentParser()
parser.add_argument('--output', type=Path, required=True)
parser.add_argument('--verify-launcher', action='store_true')
args = parser.parse_args()
rows = []
for vid, entry in D['VERIFIER_REGISTRY']['entries'].items():
    brief = (REPO / entry['brief']).read_bytes()
    expected = D['VERIFIER_BRIEF_SOURCES'][vid]
    # [EXP-A01-0312-R2] Why: old entries may name a section in a report, so compare the underlying file too. Rejected: a filename-only report/brief distinction.
    record_path = entry['record'].split(';', 1)[0].split(' section', 1)[0].split(',', 1)[0]
    record = (REPO / record_path).read_bytes() if (REPO / record_path).is_file() else None
    authored = git_bytes(entry['commit'], entry['brief'])
    row = dict(id=vid, kind=entry['subject']['kind'], brief=entry['brief'], briefSha256=digest(brief),
               declaredHashMatches=digest(brief) == entry['briefSha256'], auditedPreimageMatches=expected == {'path': entry['brief'], 'sha256': digest(brief)},
               record=entry['record'], recordFile=record_path, reportSubstituted=record == brief if record is not None else None,
               firstLine=brief.decode().splitlines()[0], savedAtVerifierCommit=authored is not None,
               verifierCommitBytesMatch=authored == brief if authored is not None else None)
    if vid in ('V-O03', 'V-O04c'):
        row['documentedLegacyException'] = 'Predates Q59c; original V-O02 instruction brief retained, explicitly named in briefRule.'
    if vid == 'V-O04i':
        row['recoveredOriginalSource'] = '/Users/sam/Claude/Projects/triplex-db-2/agents/CX-VO04I/prompt-2026-11-08T21-36-39-785Z.md'
        if args.verify_launcher:
            row['launcherBytesMatch'] = Path(row['recoveredOriginalSource']).read_bytes() == brief
    if vid == 'V-O05-round4':
        proof = json.loads((REPO / entry['briefProvenance']['record']).read_bytes())
        row['recoveryVerifierCommit'] = entry['briefProvenance']['recoveryCommit']
        row['independentRecoveryCopyMatches'] = brief == git_bytes('4c9077e', 'lab/verify/A01/v0312/O05-round4-launch-instructions.md')
        row['independentProvenanceCopyMatches'] = (REPO / entry['briefProvenance']['record']).read_bytes() == git_bytes('4c9077e', 'lab/verify/A01/v0312/O05-brief-provenance.json')
        row['lastMessageSha256'] = digest((REPO / entry['briefProvenance']['lastMessage']).read_bytes())
        row['lastMessageMatchesRecovery'] = row['lastMessageSha256'] == proof['lastSha256']
        if args.verify_launcher:
            row['launcherBytesMatch'] = Path(proof['promptSource']).read_bytes() == brief
            ledger = [json.loads(line) for line in Path(proof['ledgerSource']).read_text().splitlines()]
            row['retainedLedgerRowsMatchLive'] = all(item in ledger for item in proof['ledgerRows'])
            row['lastMessageMatchesLive'] = Path(proof['lastSource']).read_bytes() == (REPO / entry['briefProvenance']['lastMessage']).read_bytes()
    row['passed'] = row['declaredHashMatches'] and row['auditedPreimageMatches'] and row['reportSubstituted'] is False and all(v for k, v in row.items() if k in ('launcherBytesMatch', 'independentRecoveryCopyMatches', 'independentProvenanceCopyMatches', 'lastMessageMatchesRecovery', 'retainedLedgerRowsMatchLive', 'lastMessageMatchesLive'))
    rows.append(row)
report = dict(oracleEntries=sum(x['kind'] == 'oracle' for x in rows), allEntries=len(rows),
              oraclePass=sum(x['kind'] == 'oracle' and x['passed'] for x in rows), allPass=all(x['passed'] for x in rows),
              scope='Report-for-instruction substitution audit of every oracle entry, plus both world entries; legacy Q59c exceptions remain explicit.',
              sourceHead=subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=REPO, text=True).strip(), entries=rows)
args.output.write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({k: report[k] for k in ('oracleEntries', 'oraclePass', 'allEntries', 'allPass')}))
raise SystemExit(0 if report['allPass'] else 1)
