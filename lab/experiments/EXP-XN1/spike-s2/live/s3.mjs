// [XN-S2-LIVE] Why: sign local S3 API requests using Node built-ins; no client download or user credentials. Rejected: relying on an mc executable in a minimal server image.
import crypto from 'node:crypto';
import fs from 'node:fs';
const credentials=JSON.parse(fs.readFileSync(new URL('./credentials.json',import.meta.url)));
const h=(key,s)=>crypto.createHmac('sha256',key).update(s).digest();
export async function s3(method,path){
 const host='tx2-xns2-s3:9000',now=new Date().toISOString().replace(/[:-]|\.\d{3}/g,''),date=now.slice(0,8),scope=`${date}/us-east-1/s3/aws4_request`;
 const payload=crypto.createHash('sha256').update('').digest('hex'),headers=`host:${host}\nx-amz-content-sha256:${payload}\nx-amz-date:${now}\n`,signed='host;x-amz-content-sha256;x-amz-date';
 const req=[method,path,'',headers,signed,payload].join('\n'),toSign=['AWS4-HMAC-SHA256',now,scope,crypto.createHash('sha256').update(req).digest('hex')].join('\n');
 const key=h(h(h(h('AWS4'+credentials.secretKey,date),'us-east-1'),'s3'),'aws4_request');
 const authorization=`AWS4-HMAC-SHA256 Credential=${credentials.accessKey}/${scope}, SignedHeaders=${signed}, Signature=${h(key,toSign).toString('hex')}`;
 const response=await fetch(`http://${host}${path}`,{method,headers:{'x-amz-date':now,'x-amz-content-sha256':payload,authorization},signal:AbortSignal.timeout(20000)});
 return {status:response.status,body:await response.text()};
}
if(process.argv[2]==='bucket'){const r=await s3('PUT',`/${credentials.bucket}`);console.log(r);if(![200,204,409].includes(r.status))throw Error('create bucket failed')}
if(process.argv[2]==='list'){const r=await s3('GET',`/${credentials.bucket}`);console.log(r);if(r.status!==200)throw Error('list failed')}
