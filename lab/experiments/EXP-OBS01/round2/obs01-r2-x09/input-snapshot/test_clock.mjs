// [EXP-OBS01] Why: correlate actual nonce timestamps and retain genuine delay. Rejected: zero-RTT test clocks.
import assert from 'node:assert/strict';
import net from 'node:net';
import { test } from 'node:test';
import { ClockSampler } from '../bin/observer-clock.mjs';
test('persistent clock maps zero-offset host clock and reflects server delay', async()=>{
  let delay=0;const peers=new Set();
  const server=net.createServer(socket=>{peers.add(socket);let input=Buffer.alloc(0);socket.on('data',data=>{
    input=Buffer.concat([input,data]);
    while(input.length>=8){const nonce=input.subarray(0,8);input=input.subarray(8);setTimeout(()=>{const reply=Buffer.alloc(16);nonce.copy(reply);reply.writeBigUInt64BE(process.hrtime.bigint(),8);socket.write(reply);},delay);}
  });});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const clock=new ClockSampler(server.address().port);
  try{
    const first=await clock.sample();
    assert.ok(Math.abs(first.offsetMs)<=first.uncertaintyMs+.1);
    delay=15;const slow=await clock.sample();
    assert.ok(slow.receive-slow.send>=14,'real delay is included');
    assert.ok(slow.uncertaintyMs>1,'a slow observation cannot meet the 1ms gate');
    assert.notEqual(first.nonce,slow.nonce);
  }finally{clock.close();for(const peer of peers)peer.destroy();await new Promise(resolve=>server.close(resolve));}
});
