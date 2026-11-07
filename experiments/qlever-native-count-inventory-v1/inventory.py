"""Metadata-only native count inventory. No payload pages/mutation/recovery.

Reuses the independently reviewed structured read-only transport. Exact safe
COUNT wire bytes are retained before result validation; every stage persists
start/success/failure independently so a later failure cannot erase prior API
evidence. Counts describe the named/default RDF queries, never domain entities.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import time
import urllib.error

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'experiments/qlever-native-fault-preflight-v2'))
from read_bounds import canonical,read_file,read_response,require,safe_error,sync_directory,write_json
from read_native import ReadDocker,ReadQlever
from preflight import validate_inspection
from queries import ReadQuery,render

WIRE_MAXIMUM=256*1024


class Record:
    def __init__(self,directory,secret):self.directory=directory;self.secret=secret;self.sequence=0;self.stage='context'
    def write(self,label,value):
        raw=canonical(value)
        require(self.secret not in raw,'A credential echo cannot be retained')
        self.sequence+=1;path=self.directory/(f'{self.sequence:04d}-'+label+'.json')
        write_json(path,value,maximum=1024*1024);return str(path.name)
    def step(self,label,work):
        self.stage=label;started=time.monotonic();self.write(label+'-start',{'stage':label,'startedAtNs':time.time_ns()})
        try:
            value=work();self.write(label+'-ok',{'stage':label,'elapsedMsClientAndEvidenceWall':(time.monotonic()-started)*1000,'value':value});return value
        except Exception as error:
            self.write(label+'-failed',{'stage':label,'elapsedMsClientAndEvidenceWall':(time.monotonic()-started)*1000,'error':safe_error(error)});raise
    def wire(self,label,raw,*,complete,status):
        detail={'stage':label,'httpStatus':status,'rawBytesAcquired':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'complete':complete,'rawFile':None}
        if complete and len(raw)<=WIRE_MAXIMUM:
            # A malformed/untrusted response that cannot be checked for a
            # decoded credential echo is represented by its hash, not raw text.
            try:decoded=json.loads(raw);valid_json=True
            except (ValueError,UnicodeError):decoded=None;valid_json=False
            if valid_json:
                if self.secret in raw or self.secret in canonical(decoded):
                    self.write(label+'-wire-refused',{**detail,'credentialEchoRawRefused':True})
                    require(False,'Credential echo in COUNT reply; raw bytes refused')
                path=self.directory/('raw-'+label+'.json')
                descriptor=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
                try:
                    rest=memoryview(raw)
                    while rest:
                        count=os.write(descriptor,rest);require(count>0,'Incomplete raw COUNT evidence write');rest=rest[count:]
                    os.fsync(descriptor)
                finally:os.close(descriptor)
                sync_directory(path.parent);detail['rawFile']=path.name
        self.write(label+'-wire',detail)
        return detail


class WireResponse:
    def __init__(self,response,record,label):self.response=response;self.record=record;self.label=label;self.headers=response.headers;self.raw=bytearray()
    def __enter__(self):self.response.__enter__();return self
    def read(self,size):
        raw=self.response.read(min(size,WIRE_MAXIMUM-len(self.raw)+1));self.raw.extend(raw)
        require(len(self.raw)<=WIRE_MAXIMUM,'COUNT wire reply exceeds256KiB');return raw
    def __exit__(self,type_,value,traceback):
        try:self.record.wire(self.label,bytes(self.raw),complete=type_ is None,status=getattr(self.response,'status',200))
        finally:return_value=self.response.__exit__(type_,value,traceback)
        return return_value


class WireOpener:
    def __init__(self,original,record,label):self.original=original;self.record=record;self.label=label
    def open(self,*args,**kwargs):
        try:return WireResponse(self.original.open(*args,**kwargs),self.record,self.label)
        except urllib.error.HTTPError as error:
            # Persist the count channel/status and exact safe error reply before
            # the parent transport turns it into a safe exception. Never issue
            # another request or recovery action on this branch.
            raw=read_response(error,WIRE_MAXIMUM,time.monotonic()+min(6,kwargs.get('timeout',6)))
            self.record.wire(self.label,raw,complete=True,status=error.code)
            raise RuntimeError('COUNT HTTP failure status='+str(error.code)+',bodySha256='+hashlib.sha256(raw).hexdigest()) from None


class CountQlever(ReadQlever):
    def __init__(self,secret,prefix,record):super().__init__(secret);self.prefix=prefix;self.record=record;self.label=None
    def request(self,parameters,query=None,**options):
        if query is not None:
            require(type(query) is ReadQuery and query.kind=='count' and query.channel in {'named','default'} and query.prefix==self.prefix and query.offset==0,'Count-only mode rejects namespace/payload/raw/arbitrary requests')
            render(query)
            previous=self.opener;self.opener=WireOpener(previous,self.record,self.label or 'unlabelled-count')
            try:return super().request(parameters,query,**options)
            finally:self.opener=previous
        return super().request(parameters,query,**options)
    def count(self,channel,deadline):
        self.label='count-'+channel
        query=ReadQuery('count',channel,self.prefix);started=time.monotonic()
        rows=self.select(query,deadline=deadline)
        parsed=parse_count(rows)
        return {'population':channel,'query':render(query),'parsedCountDecimal':parsed,'nativeCountTerm':rows[0]['count'],'rawReply':'raw-'+self.label+'.json','elapsedMsClientDispatchThroughWireCapture':(time.monotonic()-started)*1000,'meaning':'Declared RDF COUNT query population; not domain entities/facts, engine CPU or an atomic cross-query snapshot'}


def parse_count(rows):
    require(isinstance(rows,list) and len(rows)==1 and set(rows[0])=={'count'},'COUNT reply must have one count binding')
    value=rows[0]['count'];lexical=value.get('value')
    require(value.get('type') in {'literal','typed-literal'} and isinstance(lexical,str) and re.fullmatch(r'\+?[0-9]{1,20}',lexical) is not None,'COUNT lexical/type shape differs')
    require(value.get('datatype') in {'http://www.w3.org/2001/XMLSchema#'+suffix for suffix in ['integer','int','long','nonNegativeInteger','unsignedLong']},'COUNT is not a declared integer term')
    parsed=int(lexical);require(parsed<=2**64-1,'COUNT exceeds unsigned64 metadata bound')
    return str(parsed)


def validate_context(contract,context):
    require(contract['mode']=='READ_ONLY_NATIVE_COUNT_INVENTORY' and context['root']==str(ROOT)==contract['root'],'Different metadata-only mode/workspace')
    require(contract['countWireMaximumBytes']==WIRE_MAXIMUM and contract['countWindowSeconds']==30 and contract['payloadPagesAllowed'] is False,'Count-only limits/mode changed')
    require(context['jobId']==contract['jobId'] and context['resourceBytes']==896*1024**2 and context['cpuUnits']==1,'Wrong canonical count-inventory grant')
    require(context['rootDevice']==ROOT.stat().st_dev and context['stateOwnerSha256']==contract['stateOwnerSha256'],'Canonical owner/mount changed')
    owner=context['mainOwner'];require(owner['status']=='active' and owner['containerId']==contract['containerId'] and owner['imageSha256']==contract['imageSha256'] and owner['resources']['memoryBytes']==2*1024**3 and owner['resources']['cpuUnits']==1.5 and owner['startedAt']==contract['registeredStartedAt'],'Main owner/epoch/caps changed')
    require(not context['otherActiveQJobs'],'Other Q work blocks metadata inventory')


def run(contract,context,docker,native,record):
    validate_context(contract,context)
    def owner(label):
        item=docker.inspect(contract['containerId'])
        safe={'containerId':item.get('Id'),'imageSha256':item.get('Image'),'running':item.get('State',{}).get('Running'),'startedAt':item.get('State',{}).get('StartedAt'),'memoryBytes':item.get('HostConfig',{}).get('Memory'),'nanoCpus':item.get('HostConfig',{}).get('NanoCpus'),'rawCommandEnvironment':'EXCLUDED'}
        record.write(label+'-observation',safe)
        return validate_inspection(contract,context,item,native.secret)
    before=record.step('owner-before',lambda:owner('owner-before'))
    values=record.step('owned-processes',lambda:[{'containerId':item['Id'],'running':item['State']['Running']} for item in docker.owned(contract['ownerLabel'])])
    require(all(not item['running'] or item['containerId']==contract['containerId'] for item in values),'Another owned Q process is live')
    def profile(label):
        def stats():
            raw=native.request({'cmd':'stats'});return {key:raw.get(key) for key in ['version-server','git-hash-server']}
        version=record.step(label+'-version',stats);require(version=={'version-server':'v0.6.0','git-hash-server':'6c5861a'},'Pinned runtime differs')
        def settings():
            raw=native.request({'cmd':'get-settings'});return {key:raw.get(key) for key in ['query-planning-budget','cache-max-size','cache-max-size-single-entry']}
        actual=record.step(label+'-settings',settings);require(actual=={'query-planning-budget':'100','cache-max-size':'64 MB','cache-max-size-single-entry':'32 MB'},'Read-only settings differ; no restore is attempted')
        return {'version':version,'settings':actual}
    initial=profile('before')
    def activity(label):
        raw=native.active();observation={'empty':not raw,'entries':len(raw),'replySha256':hashlib.sha256(canonical(raw)).hexdigest()};record.write(label+'-observation',observation);require(not raw,'A native query is active');return observation
    record.step('activity-before-1',lambda:activity('activity-before-1'));time.sleep(.1)
    record.step('activity-before-2',lambda:activity('activity-before-2'))
    counts={};deadline=time.monotonic()+30
    for channel in ['named','default']:
        require(time.monotonic()<deadline,'Metadata count window exceeded30s before call')
        counts[channel]=record.step('count-'+channel,lambda:native.count(channel,deadline))
        require(time.monotonic()<=deadline,'Metadata count window exceeded30s during call')
    final=profile('after');require(final==initial,'Native profile observations differ')
    record.step('activity-after',lambda:activity('activity-after'))
    after=record.step('owner-after',lambda:owner('owner-after'));require(after==before,'Owner/epoch observations differ')
    return {'format':'triplex-qlever-native-count-inventory/1','counts':counts,'payloadPagesRequested':0,'continuityAttempted':False,'settingsBefore':initial,'settingsAfter':final,'existingContinuity200kBudgetWasNotRaised':True,'sumOfSeparateRdfPopulationsWithinExistingBudget':sum(int(value['parsedCountDecimal']) for value in counts.values())<=200000,'priorV2ExactCountAndChannelStillNotReconstructed':True,'claim':'RDF_POPULATION_OBSERVATIONS_ONLY_NO_ENTITY_FACT_OR_PERFORMANCE_ACCEPTANCE'}


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--contract',type=Path,required=True);args=parser.parse_args()
    artifacts=Path(os.environ['TRIPLEX_RUN_ARTIFACTS']).resolve(strict=True);require(artifacts.is_relative_to(ROOT/'.devloop/jobs'),'Unowned artifact directory')
    record=None
    try:
        raw=read_file(args.contract,1024*1024);contract=json.loads(raw)
        data=sys.stdin.buffer.read(1024*1024+1);require(len(data)<=1024*1024,'Context exceeds1MiB');context=json.loads(data)
        require(context['contractSha256']==hashlib.sha256(raw).hexdigest(),'Contract context hash differs');validate_context(contract,context)
        selected=Path(sys.executable).resolve();require(str(selected)==contract['pythonRuntime']['path'],'Host Python selection differs')
        with selected.open('rb') as stream:require(hashlib.file_digest(stream,'sha256').hexdigest()==contract['pythonRuntime']['sha256'],'Host executable changed')
        path=ROOT/'.runtime/engines/qlever-main/access-token';require(path.stat().st_mode&0o777==0o600 and path.stat().st_uid==os.getuid(),'Token must be owned0600')
        secret=read_file(path,256).strip();require(32<=len(secret)<=256,'Invalid token carrier')
        record=Record(artifacts,secret);native=CountQlever(secret,contract['namespace'],record)
        result=run(contract,context,ReadDocker(ROOT,contract['daemonId']),native,record)
        write_json(artifacts/'report.json',result)
        write_json(artifacts/'checks.json',{'format':'triplex-native-count-inventory-checks/1','twoCountRepliesRetained':True,'integerLexicalParsingExact':True,'ownerAndSettingsUnchanged':True,'payloadPagesRequested':0,'readOnly':True})
    except Exception as error:
        write_json(artifacts/'failure.json',{'stage':None if record is None else record.stage,'error':safe_error(error),'policy':'FAIL_RETAIN_INCREMENTAL_EVIDENCE_NO_RETRY_MUTATION_OR_RECOVERY'})
        raise SystemExit(1) from None


if __name__=='__main__':main()
