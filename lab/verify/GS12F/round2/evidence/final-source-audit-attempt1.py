# [CX-VGS12F-R2] Why: confirm exact builder bytes and preserve the one amended discovery config preimage.
# Rejected: calling a completed command source-bound without checking for concurrent source changes.
import pathlib,json,hashlib,subprocess,datetime
root=pathlib.Path('lab/verify/GS12F/round2');out=root/'evidence'
sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
first=json.loads((out/'execution-sources.json').read_text())
changed=[p for p,h in first['files'].items() if sha(p)!=h]
assert changed==['lab/verify/GS12F/round2/vitest.config.ts'],changed
old=out/'attempt1-sources/vitest.config.ts';assert sha(old)==first['files'][changed[0]]
production={p:h for p,h in first['files'].items() if p.startswith('packages/') or p in ['pnpm-lock.yaml','vitest.workspace-aliases.ts','test/integration/test/value-domains.test.ts']}
assert all(sha(p)==h for p,h in production.items())
new={str(p):sha(p) for p in root.glob('*') if p.is_file()}
for manifest in ['matrix-sources.json','live-sources.json','backend-attempt2-sources.json']:
 for p,h in json.loads((out/manifest).read_text()).items():
  assert sha(p)==h,(manifest,p)
(out/'final-source-audit.json').write_text(json.dumps(dict(at=datetime.datetime.now(datetime.timezone.utc).isoformat(),target=first['target'],productionFilesUnchanged=len(production),reviewerDiscoveryConfigAmendedAfterFirstRun=True,preservedConfigPreimage=str(old),currentReviewerFiles=new),indent=2)+'\n')
print('All reviewed production inputs and supplement source captures unchanged; first discovery-config preimage verified.')
