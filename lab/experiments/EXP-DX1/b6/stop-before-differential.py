# [DX-B6] Why: replace an oversized, not-yet-started test window after all four confirmation windows complete.
# Rejected: editing a running controller or terminating an active engine/test grant.
import pathlib,subprocess,os,signal,time,json,datetime
root=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B6')
controller=45676;heavy=39977
while True:
 try:os.kill(controller,0)
 except ProcessLookupError:raise SystemExit('controller ended before the tail handoff')
 log=(root/'final-confirmation.log').read_text()
 if 'Completed reach-lean-b ' in log:
  assert 'Starting differential-b ' not in log,'differential already started; do not interrupt'
  details=subprocess.check_output(['ps','-p',str(controller),'-o','ppid=,command='],text=True).strip().split(None,1)
  assert int(details[0])==heavy and 'final-confirmation.sh' in details[1]
  assert 'Starting differential-b ' not in (root/'final-confirmation.log').read_text()
  os.kill(controller,signal.SIGTERM)
  (root/'confirmation-tail-handoff.json').write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'controllerPid':controller,'heavyPid':heavy,'action':'terminated between completed windows','lastCompleted':'reach-lean-b','replacement':'three RNG-contiguous 100-scenario differential batches'},indent=2)+'\n')
  break
 time.sleep(.25)
