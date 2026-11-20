import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {memoryComposition} from "../../../bench/lib/memory.ts";
import {W0} from "../../../bench/lib/w0-world.ts";
import {Account,sourceFormats} from "./account.ts";
import {Objects} from "./store.ts";
test("a fenced writer reads the original DELTA head and preserves its historical release",async()=>{
  const c=memoryComposition("datomic","delta-legacy-"+randomUUID()), db=new Objects(c,"target"), a=new Account(db,"legacy"),
    id="pl:a",b={tx:1,validTime:W0.POPULATION_VALID_TIME};
  try{
    const seed=await a.bootstrap([id],[{subject:id,facts:[]}],b), prior=await a.head(seed.position);
    const old=await db.commit("legacy-head",[{key:"head",prior,value:{...prior.value,compiler:"85f74b77efaf2fb4e7e5d9d019049bcfc109cff98454f202ec2c1726c867d323"}}]);
    assert.equal((await a.readAt(id,old.position)).output.release,W0.R1.hash);
    const fresh=await a.seal("new",W0.R2);
    assert.equal((await a.head(fresh.position)).value.compiler,sourceFormats);
    assert.equal((await a.readAt(id,old.position)).output.release,W0.R1.hash);
    assert.equal((await a.readAt(id,fresh.position)).output.release,W0.R2.hash);
  }finally{await c.close();}
});
