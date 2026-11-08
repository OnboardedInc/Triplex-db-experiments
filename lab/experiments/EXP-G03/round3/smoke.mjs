// [EXP-G03] Why: exercise the protected-clone fixture foundation before migrating assertions. Rejected: debugging 108 cases behind one setup failure.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {buildFixtures} from '../../../bin/test/claim-fixtures.mjs';import {containedFixtures} from '../../../bin/test/contained-fixtures.mjs';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'g03-r3-smoke-'));let h;
try{h=containedFixtures(buildFixtures(root),'smoke');const r=h.run('RUN-CANDIDATE');fs.writeFileSync('lab/experiments/EXP-G03/round3/smoke-result-2.json',JSON.stringify(r,null,2));console.log(JSON.stringify({core:r.run.core,instances:r.run.instances.length,cases:r.run.cases.length,reasons:r.reasons,root}));}
finally{h?.cleanup();fs.rmSync(root,{recursive:true,force:true})}
