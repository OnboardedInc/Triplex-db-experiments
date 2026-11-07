import {execFile} from 'node:child_process';
import {basename,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';

export const benchmarkCloneModulePath=fileURLToPath(import.meta.url);
const sourceParent=dirname(dirname(benchmarkCloneModulePath));
const sourceRoot=basename(sourceParent)==='build'?dirname(sourceParent):sourceParent;
export const benchmarkCloneHelperPath=join(sourceRoot,'adapter','clone-benchmark-fixture.py');
const executeFile=promisify(execFile);

export async function cloneBenchmarkFixture(source,destination) {
  try {
    const {stdout}=await executeFile('python3',[benchmarkCloneHelperPath,source,destination]);
    return JSON.parse(stdout);
  } catch(error) {
    if(error.stdout){
      const result=JSON.parse(error.stdout);
      throw Object.assign(new Error(result.message),{code:result.code,errno:result.errno});
    }
    throw error;
  }
}
