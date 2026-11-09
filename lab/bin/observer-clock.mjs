// [EXP-OBS01] Why: timestamp a nonce write on an established TCP connection, not HTTP setup/thread dispatch.
// Rejected: widening uncertainty or selecting fabricated VM-local samples to hide network scheduling delay.
import net from 'node:net';
import { randomBytes } from 'node:crypto';
export class ClockSampler {
  constructor(port) { this.port=port; this.pending=null; this.socket=null; this.buffer=Buffer.alloc(0); }
  async connect() {
    if (this.socket && !this.socket.destroyed) return;
    this.socket=net.connect({host:'127.0.0.1',port:this.port});this.socket.unref();this.buffer=Buffer.alloc(0);
    this.socket.on('data',data=>{
      this.buffer=Buffer.concat([this.buffer,data]);
      if (this.buffer.length<16) return;
      const receive=Number(process.hrtime.bigint())/1e6;
      const p=this.pending;
      if (!p || this.buffer.length!==16 || !this.buffer.subarray(0,8).equals(p.nonce)) { this.socket.destroy(new Error('clock nonce/framing mismatch')); return; }
      const observerMono=Number(this.buffer.readBigUInt64BE(8))/1e6;
      this.buffer=Buffer.alloc(0);this.pending=null;clearTimeout(p.timer);
      p.resolve({send:p.send,receive,observerMono,nonce:p.nonce.toString('hex'),uncertaintyMs:(receive-p.send)/2,offsetMs:observerMono-(p.send+receive)/2});
    });
    this.socket.on('error',error=>{ if(this.pending){clearTimeout(this.pending.timer);this.pending.reject(error);this.pending=null;} });
    this.socket.on('close',()=>{if(this.pending){clearTimeout(this.pending.timer);this.pending.reject(new Error('clock closed'));this.pending=null;}});
    await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.socket.destroy();reject(new Error('clock connect timeout'));},2000);this.socket.once('connect',()=>{clearTimeout(timer);resolve();});this.socket.once('error',error=>{clearTimeout(timer);reject(error);});});
  }
  async sample() {
    await this.connect();
    if(this.pending) throw new Error('concurrent clock samples');
    return new Promise((resolve,reject)=>{
      const nonce=randomBytes(8); nonce[0]|=128; const send=Number(process.hrtime.bigint())/1e6;
      const timer=setTimeout(()=>{this.pending=null;this.socket.destroy();reject(new Error('clock reply timeout'));},2000);
      this.pending={nonce,send,timer,resolve,reject};this.socket.write(nonce);
    });
  }
  close() { this.socket?.destroy(); }
}
