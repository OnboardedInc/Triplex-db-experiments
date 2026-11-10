import assert from 'node:assert/strict';
import { test } from 'node:test';
import { completedMaintenanceInWindow, requestIndex } from '../lib/maintenance.ts';
test('recorded gateway-clock offsets cannot misattribute completed level jobs', () => {
  const events = [0,1,2,3,4,5].map(i => ({phase:`L${[1,4,16,64,256,1024][i]}`, completed:true,
    requestedAtMs:1794270000000+i*30000, completedAtMs:1794270000050+i*30000,
    driverRequestedAtMs:100200+i*30000, driverCompletedAtMs:100250+i*30000}));
  for (let i=0;i<6;i++) {
    const from=100000+i*30000, to=from+30000, phase=events[i].phase;
    assert.equal(events.filter(e=>completedMaintenanceInWindow(e,phase,from,to)).length,1);
    for (const patch of [{completed:false},{driverRequestedAtMs:from-1},{driverCompletedAtMs:to},{phase:'other'}])
      assert.equal(completedMaintenanceInWindow({...events[i],...patch},phase,from,to),false);
  }
});
test('request job validates database/content and the 60-second response budget', async () => {
  const body={database:'db',job:'12345678-1234-1234-1234-123456789abc',requestedT:'8',requestedAtMs:5,completedAtMs:9,completed:true};
  for (const [patch,elapsed,expected] of [[{},100,true],[{database:'wrong'},100,false],[{},60001,false],[{completedAtMs:4},100,false]] as const) {
    let t=0;
    const event=await requestIndex({request:async()=>({...body,...patch})},'db','p4h10',()=>t++ ? elapsed : 0,60000);
    assert.equal(event.completed,expected);
  }
});
