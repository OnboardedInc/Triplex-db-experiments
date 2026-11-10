import http from "node:http";
import {DatomicClient} from "../../../../packages/datomic/dist/index.js";
import {installDatomicPublication, observeDatomicPublication} from "../../../bench/lib/datomic-publication.ts";
// [DX-B4-T3] Why: reproduce the inherited observer's obsolete position binding against the real client validator.
// Rejected: changing the observer outside this task's named bench edits or weakening the client's ACK validation.
const response={operationId:"operation", position:{t:"long",v:"2"},t:{t:"long",v:"100"},datoms:1,delta:1};
const server=http.createServer(async(req,res)=>{for await (const _ of req) {} res.setHeader("content-type","application/json");res.end(JSON.stringify(response));});
await new Promise(r=>server.listen(0,"127.0.0.1",r));
const client=new DatomicClient(`http://127.0.0.1:${server.address().port}`);
const input={sourceK:null,position:1,span:1,operationId:"operation",attemptId:"attempt",rows:[],newIds:[],claims:[]};
let publications=0;
try {
 const accepted=await client.transact("scope",input);
 installDatomicPublication({DatomicClient});observeDatomicPublication(()=>publications++);
 let error;
 try {await client.transact("scope",input);} catch(e) {error=e.message;}
 if(accepted.position.v!=="2" || error!=="Datomic publication response/input binding mismatch" || publications!==0) throw Error("Reproduction did not match");
 console.log(JSON.stringify({realClientAccepted:accepted, observerError:error, publicationWitnesses:publications}));
} finally {observeDatomicPublication(undefined);client.close();await new Promise(r=>server.close(r));}
