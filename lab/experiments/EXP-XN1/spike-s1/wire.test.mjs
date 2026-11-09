// @ts-nocheck -- [EXP-XN1] Why: a fake pgwire peer exercises runtime buffers. Rejected: loading a Triplex package for this spike.
// [EXP-XN1] Why: reproduce the long-lock-wait socket failure without a two-minute test.
// Rejected: syntax-only validation (cannot catch unresolved promises after idle expiry).
import net from 'node:net';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as sleep} from 'node:timers/promises';
import {Wire} from './wire.mjs';
function message(type,body){const h=Buffer.alloc(5);h[0]=type.charCodeAt(0);h.writeInt32BE(body.length+4,1);return Buffer.concat([h,body])}
async function peer(t,reply=true){
 const sockets=new Set();const server=net.createServer(socket=>{sockets.add(socket);let startup=true;
 socket.on('close',()=>sockets.delete(socket));
 socket.on('data',()=>{if(startup){startup=false;socket.write(Buffer.concat([message('R',Buffer.alloc(4)),message('Z',Buffer.from('I'))]));}
 else if(reply)socket.write(Buffer.concat([message('C',Buffer.from('SELECT 0\0')),message('Z',Buffer.from('I'))]));});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(async()=>{for(const s of sockets)s.destroy();await new Promise(r=>server.close(r));});
 return `postgres://generic:generic@127.0.0.1:${server.address().port}/xtdb`;
}
test('an idle connection survives longer than its timeout and remains usable',async t=>{
 const c=await Wire.connect(await peer(t),{idleTimeoutMs:20});t.after(()=>c.socket.destroy());
 await sleep(100);assert.equal(c.socket.destroyed,false);assert.deepEqual(await c.query('SELECT 1'),[]);
});
test('a destroyed connection rejects rather than enqueueing an unresolved query',async t=>{
 const c=await Wire.connect(await peer(t),{idleTimeoutMs:20});c.socket.destroy();
 await assert.rejects(c.query('SELECT 1'),/already closed/);await assert.rejects(c.prepare('p','SELECT 1',[]),/already closed/);assert.equal(c.pending.length,0);
});
test('an active unanswered query still times out and rejects its pending promise',async t=>{
 const c=await Wire.connect(await peer(t,false),{idleTimeoutMs:20});t.after(()=>c.socket.destroy());
 await assert.rejects(c.query('SELECT 1'),/wire timeout/);assert.equal(c.pending.length,0);
});
