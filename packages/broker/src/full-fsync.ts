// [EXP-P2B-R3] Why: a pragma and elapsed-time calibration cannot prove F_FULLFSYNC is supported on this volume.
// Rejected: a sub-millisecond heuristic or silently falling back to ordinary fsync after ENOTSUP.
import { createRequire } from "node:module";
export class FullFsyncUnavailable extends Error {
  readonly _tag = "FullFsyncUnavailable";
  readonly reason = "full-fsync-unavailable";
  constructor(message: string) {
    super(message);
    this.name = "FullFsyncUnavailable";
  }
}
export const fullFsyncProbeSource = String.raw`
const fs=require('node:fs'),{spawnSync}=require('node:child_process');
if(process.platform!=='darwin')throw Error('FULL_FSYNC_UNAVAILABLE: F_FULLFSYNC requires darwin');
const code="import os,sys,fcntl,json\nfd=os.open(sys.argv[1],os.O_RDWR)\ntry:\n fcntl.fcntl(fd,fcntl.F_FULLFSYNC)\n st=os.fstat(fd)\n print(json.dumps(dict(primitive='F_FULLFSYNC',dev=str(st.st_dev),ino=str(st.st_ino))))\nfinally:\n os.close(fd)";
const result=spawnSync('/usr/bin/python3',['-I','-c',code,file],{encoding:'utf8',timeout:10000});
if(result.error||result.status!==0)throw Error('FULL_FSYNC_UNAVAILABLE: native probe failed: '+String(result.error??result.stderr));
let proof;try{proof=JSON.parse(result.stdout);}catch{throw Error('FULL_FSYNC_UNAVAILABLE: invalid native probe result');}
const stat=fs.statSync(file,{bigint:true});
if(proof.primitive!=='F_FULLFSYNC'||proof.dev!==String(stat.dev)||proof.ino!==String(stat.ino))throw Error('FULL_FSYNC_UNAVAILABLE: native probe file identity mismatch');
return {primitive:proof.primitive,dev:proof.dev,ino:proof.ino,at:Date.now()};
`;
export const probeFullFsync = (
  file: string,
): { primitive: string; dev: string; ino: string; at: number } => {
  try {
    return Function("file", "require", fullFsyncProbeSource)(file, createRequire(import.meta.url));
  } catch (error) {
    throw new FullFsyncUnavailable(String(error));
  }
};
