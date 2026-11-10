import fs from "node:fs";
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

test('real OM2 response list reproduces five missed windows under the mixed-clock comparison', async () => {
  const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/dxh3-om2-maintenance.json',import.meta.url),'utf8'));
  assert.deepEqual(fixture.windows.map((w:any)=>fixture.events.filter((e:any)=>e.phase===w.phase && e.completed && e.requestedAtMs>=w.from && e.completedAtMs<w.to).length),[1,0,0,0,0,0]);
  for(const w of fixture.windows) {
    const raw=fixture.events.find((e:any)=>e.phase===w.phase);
    let n=0;
    // Driver request/response samples are simulated; raw gateway response bytes above are recorded.
    const event=await requestIndex({request:async()=>raw},raw.database,w.phase,()=>n++ ? w.from+5000 : w.from+1,60000);
    assert.equal(completedMaintenanceInWindow(event,w.phase,w.from,w.to),true);
  }
});
