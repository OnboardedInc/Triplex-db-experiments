"""Create immutable candidate and real current-main merge clones, with no reviewed edits."""
import json
from pathlib import Path
import shutil
import subprocess
import time
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
CANDIDATE='6b8d2182d78e567cf8e385622c9a259e8892687a'
MAIN='e90c15846a7fb0b93f7d4debdef3dcb76a4f24d4'
RAW=Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VA01-0311/contract-0.3.13-attempt1')
def command(a,cwd=ROOT):return subprocess.run(a,cwd=cwd,capture_output=True,text=True)
def main():
 assert shutil.disk_usage(ROOT).free >= 5*1024**3
 assert not RAW.exists()
 RAW.mkdir(parents=True)
 meta={'candidate':CANDIDATE,'main':MAIN,'reviewerHead':command(['git','rev-parse','HEAD']).stdout.strip(),'started':time.time(),'freeBytes':shutil.disk_usage(ROOT).free,'raw':str(RAW)}
 for name in ('scratch','merged'):
  r=command(['git','clone','--shared','--no-checkout',str(ROOT),str(HERE/name)]);assert r.returncode==0,r.stderr
  r=command(['git','checkout','-b','review-0313',CANDIDATE],HERE/name);assert r.returncode==0,r.stderr
 # [CX-VA01-0313] Why: Q87 checks a real merge with current main, not an archive or a historical source. Rejected: resolving code conflicts on behalf of the builder under an independent-review verdict.
 r=command(['git','-c','user.name=Contract Reviewer','-c','user.email=noreply@openai.com','merge','--no-ff',MAIN,'-m','Review contract 0.3.13 against current main\n\nCo-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>'],HERE/'merged')
 (RAW/'merge.log').write_text(r.stdout+r.stderr)
 meta.update(mergeExit=r.returncode,mergeHead=command(['git','rev-parse','HEAD'],HERE/'merged').stdout.strip(),conflicts=command(['git','diff','--name-only','--diff-filter=U'],HERE/'merged').stdout.splitlines())
 (HERE/'source.json').write_text(json.dumps(meta,indent=2)+'\n')
 print(json.dumps(meta))
if __name__=='__main__':main()
