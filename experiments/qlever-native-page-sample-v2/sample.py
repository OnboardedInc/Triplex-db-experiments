"""OPAQUE_NATIVE_ORDER_PREFIX_ONLY; no codepoint-order qualification.

Inspired by the frozen continuity renderer, whose actual200k-row refusal and
later exact count inventory establish a budget-selection problem, not a reason
to increase limits without payload evidence. Keep its page shape unchanged and
measure only six explicit pages. No operational fault modules are imported.
"""
from __future__ import annotations
import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'experiments/qlever-native-fault-preflight-v2'))
from read_bounds import canonical,read_file,require,safe_error,sync_directory,write_json
from read_native import ReadDocker,ReadQlever,refuse
from preflight import validate_inspection
from queries import ReadQuery,render

MIB=1024**2
PLAN=(('named',0),('named',256),('named',0),('default',0),('default',256),('default',0))
BOUNDS={'responseBytes':2*MIB,'rawReplyBytes':12*MIB,'canonicalBytes':16*MIB,'gzipBytes':16*MIB,'metadataBytes':4*MIB,'pageRows':256,'maximumPages':6,'pageWindowSeconds':60,'requestSeconds':6,'nativeTimeoutMilliseconds':5000}
DEFAULT_GRAPH='urn:triplex:fault-v2:default-graph-observation'
XSD='http://www.w3.org/2001/XMLSchema#'
RDF='http://www.w3.org/1999/02/22-rdf-syntax-ns#'


PROFILE='OPAQUE_NATIVE_ORDER_PREFIX_ONLY'


class Record:
    def __init__(self,directory,secret):
        self.directory=directory;self.secret=secret;self.sequence=0;self.stage='context';self.metadata_bytes=0;self.raw_bytes=0;self.canonical_bytes=0;self.gzip_bytes=0
    def write(self,label,value):
        raw=canonical(value)+b'\n';require(self.secret not in raw,'Credential echo cannot be retained')
        require(self.metadata_bytes+len(raw)<=BOUNDS['metadataBytes'],'Sample metadata exceeds4MiB')
        self.sequence+=1;self.metadata_bytes+=len(raw)
        path=self.directory/(f'{self.sequence:04d}-'+label+'.json');write_json(path,value,maximum=MIB);return path.name
    def step(self,label,work,project=lambda value:value):
        self.stage=label;start=time.monotonic();self.write(label+'-start',{'stage':label,'startedAtNs':time.time_ns()})
        try:
            result=work();self.write(label+'-ok',{'stage':label,'elapsedMsClientAndEvidenceWall':(time.monotonic()-start)*1000,'value':project(result)});return result
        except Exception as error:
            self.write(label+'-failed',{'stage':label,'elapsedMsClientAndEvidenceWall':(time.monotonic()-start)*1000,'error':safe_error(error)});raise
    def wire(self,label,raw,*,complete,status):
        detail={'httpStatus':status,'complete':complete,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'rawFile':None}
        if complete:
            try:decoded=json.loads(raw)
            except (ValueError,UnicodeError):decoded=None
            if decoded is not None:
                require(self.secret not in raw and self.secret not in canonical(decoded),'Credential echo in page reply; raw bytes refused')
                require(self.raw_bytes+len(raw)<=BOUNDS['rawReplyBytes'],'Raw page files exceed12MiB')
                path=self.directory/('raw-'+label+'.json');write_bytes(path,raw);self.raw_bytes+=len(raw);detail['rawFile']=path.name
        self.write(label+'-wire',detail);return detail


def write_bytes(path,raw):
    require(not any(part.is_symlink() for part in [path,*path.parents]),'Linked evidence destination')
    descriptor=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
    try:
        remaining=memoryview(raw)
        while remaining:
            count=os.write(descriptor,remaining);require(count>0,'Incomplete page evidence write');remaining=remaining[count:]
        os.fsync(descriptor)
    finally:os.close(descriptor)
    sync_directory(path.parent)


class CappedGzipFile:
    def __init__(self,stream,record):self.stream=stream;self.record=record;self.bytes=0
    def write(self,raw):
        require(self.record.gzip_bytes+len(raw)<=BOUNDS['gzipBytes'],'Compressed sample exceeds16MiB')
        count=self.stream.write(raw);require(count==len(raw),'Incomplete compressed sample write');self.record.gzip_bytes+=count;self.bytes+=count;return count
    def flush(self):self.stream.flush()


def term(value):
    require(isinstance(value,dict) and set(value)<={'type','value','datatype','xml:lang'},'Unexpected RDF term channels')
    require(value.get('type') in {'uri','bnode','literal','typed-literal'} and isinstance(value.get('value'),str),'Invalid RDF term')
    require(all(isinstance(value[key],str) for key in ['datatype','xml:lang'] if key in value),'Nonstring datatype/language channel')
    require(value['type'] in {'literal','typed-literal'} or not set(value)&{'datatype','xml:lang'},'IRI/blank term has literal channels')
    return value


def row_value(channel,row):
    selected={'g','s','p','o'} if channel=='named' else {'s','p','o'}
    require(isinstance(row,dict) and set(row)==selected,'Missing/extra page binding')
    result={key:term(value) for key,value in row.items()}
    if channel=='default':result['g']={'type':'uri','value':DEFAULT_GRAPH}
    require(result['g']['type']=='uri' and result['p']['type']=='uri' and result['s']['type'] in {'uri','bnode'},'Invalid RDF graph/predicate/subject')
    return {'channel':channel,**result}


def order_key(value):
    # The inherited renderer orders STR(subject/object), which does not provide
    # an independently checked key here for blank nodes. Record unavailable
    # ordinal diagnostics for those rows; opaque identity checks retain them.
    if value['s']['type']=='bnode' or value['o']['type']=='bnode':return None
    obj=value['o'];literal=obj['type'] in {'literal','typed-literal'}
    datatype=obj.get('datatype',RDF+'langString' if obj.get('xml:lang') else XSD+'string') if literal else ''
    return (value['g']['value'],value['s']['value'],value['p']['value'],'literal' if literal else 'iri',obj['value'],datatype,obj.get('xml:lang','') if literal else '')


def capture_rows(record,label,channel,rows):
    require(isinstance(rows,list) and len(rows)==256,'First-page calibration requires exactly256 returned rows')
    digest=hashlib.sha256();identities=[];keys=[];canonical_bytes=0
    path=record.directory/(label+'.jsonl.gz');descriptor=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
    with os.fdopen(descriptor,'wb') as stream:
        capped=CappedGzipFile(stream,record)
        with gzip.GzipFile(filename='',fileobj=capped,mode='wb',mtime=0) as compressed:
            for row in rows:
                value=row_value(channel,row);raw=canonical(value)+b'\n';require(record.secret not in raw,'Credential echo in canonical row refused')
                record.canonical_bytes+=len(raw);require(record.canonical_bytes<=BOUNDS['canonicalBytes'],'Canonical sample exceeds16MiB')
                canonical_bytes+=len(raw);digest.update(raw);identities.append(hashlib.sha256(raw).hexdigest());keys.append(order_key(value));compressed.write(raw)
        stream.flush();os.fsync(stream.fileno())
    sync_directory(path.parent)
    duplicates=len(identities)-len(set(identities));strictly_ordered=all(left<right for left,right in zip(keys,keys[1:])) if all(key is not None for key in keys) else None
    summary={'rows':len(rows),'canonicalBytes':canonical_bytes,'canonicalBytesPerRow':canonical_bytes/len(rows),'canonicalSha256':digest.hexdigest(),'gzipFile':path.name,'gzipBytes':capped.bytes,'gzipBytesPerRow':capped.bytes/len(rows),'duplicateIdentitiesWithinPage':duplicates,'strictCodepointOrderDiagnostic':strictly_ordered,'codepointOrderQualified':False,'orderingProfile':PROFILE,'termChannelsRetained':True}
    return summary,identities,keys


class SampleQlever(ReadQlever):
    select=refuse
    def __init__(self,secret,prefix,record):super().__init__(secret);self.prefix=prefix;self.record=record;self.calls=0;self.failed=False
    def request(self,parameters,query=None,**options):
        require(query is None,'Use only the fixed six-page schedule; raw/COUNT/arbitrary SELECT refused')
        return super().request(parameters,None,**options)
    def page(self,channel,offset,deadline):
        require(not self.failed and self.calls<len(PLAN) and (channel,offset)==PLAN[self.calls],'Page request differs from fixed six-call schedule')
        require(time.monotonic()<deadline,'Sample page window expired before dispatch')
        label=f'page-{self.calls+1:02d}-{channel}-{offset}';self.calls+=1
        query=ReadQuery('page',channel,self.prefix,offset);text=render(query)
        remaining=min(BOUNDS['nativeTimeoutMilliseconds'],int((deadline-time.monotonic())*1000));require(remaining>=1,'Sample page deadline expired before native timeout selection')
        request=urllib.request.Request(self.url+'/?'+urllib.parse.urlencode({'timeout':str(remaining)+'ms'}),data=text.encode(),headers={'Accept':'application/json','Authorization':'Bearer '+self.secret.decode(),'Content-Type':'application/sparql-query'},method='POST')
        started=time.monotonic();wall_start=time.time_ns();request_deadline=min(deadline,started+BOUNDS['requestSeconds']);raw=bytearray();status=None;complete=False;headers_at=None;returned_at=None;parsed_at=None
        try:
            try:response=self.opener.open(request,timeout=request_deadline-time.monotonic())
            except urllib.error.HTTPError as error:response=error
            headers_at=time.monotonic();status=getattr(response,'status',getattr(response,'code',None))
            with response:
                declared=response.headers.get('Content-Length');require(declared is None or declared.isdigit() and int(declared)<=BOUNDS['responseBytes'],'Declared page reply exceeds2MiB')
                while True:
                    require(time.monotonic()<request_deadline,'Page reply acquisition deadline expired')
                    part=response.read(min(65536,BOUNDS['responseBytes']-len(raw)+1))
                    if not part:complete=True;break
                    raw.extend(part);require(len(raw)<=BOUNDS['responseBytes'],'Page reply exceeds2MiB')
            returned_at=time.monotonic();parsed=json.loads(raw);parsed_at=time.monotonic()
            wire=self.record.wire(label,bytes(raw),complete=True,status=status);wire_at=time.monotonic()
            require(status==200,'Page HTTP status differs; safe wire evidence retained')
            variables=['g','s','p','o'] if channel=='named' else ['s','p','o']
            require(isinstance(parsed,dict) and isinstance(parsed.get('head'),dict) and parsed['head'].get('vars')==variables,'Page SELECT variable header differs')
            rows=parsed.get('results',{}).get('bindings');summary,identities,keys=capture_rows(self.record,label,channel,rows);captured_at=time.monotonic()
            timing={'startedAtNs':wall_start,'dispatchToHeadersMs':(headers_at-started)*1000,'headersToBodyReturnMs':(returned_at-headers_at)*1000,'jsonParseMs':(parsed_at-returned_at)*1000,'safeWireCaptureAndFsyncMs':(wire_at-parsed_at)*1000,'rowValidationCanonicalGzipAndFsyncMs':(captured_at-wire_at)*1000,'dispatchThroughCaptureMs':(captured_at-started)*1000,'meaning':'CLIENT_WALL_INCLUDES_DRIVER_NETWORK_SERVER_WAIT_AND_EVIDENCE_NOT_ENGINE_CPU'}
            result={'channel':channel,'offset':offset,'query':text,'wire':wire,'rawBytesPerRow':len(raw)/len(rows),'rows':summary,'timing':timing}
            self.record.write(label+'-measurement',result)
            require(time.monotonic()<=deadline,'Sample page window expired during parse/capture')
            require(summary['duplicateIdentitiesWithinPage']==0,'Duplicate identities refuse prefix calibration')
            return result,identities,keys
        except Exception:
            self.failed=True
            # Partial/malformed/oversized replies retain only length/hash unless
            # a complete safe JSON wire file was already written above.
            if not any(path.name=='raw-'+label+'.json' for path in self.record.directory.iterdir()):
                self.record.write(label+'-incomplete-wire',{'httpStatus':status,'complete':complete,'bytesAcquired':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'rawFile':None})
            self.record.write(label+'-partial-timing',{'startedAtNs':wall_start,'dispatchToFailureMs':(time.monotonic()-started)*1000,'dispatchToHeadersMs':None if headers_at is None else (headers_at-started)*1000,'dispatchToBodyReturnMs':None if returned_at is None else (returned_at-started)*1000,'dispatchToParseCompleteMs':None if parsed_at is None else (parsed_at-started)*1000,'scope':'CLIENT_WALL_ONLY_PARTIAL_FAILURE_NO_PHYSICAL_CANCELLATION_PROOF'})
            raise


def validate_context(contract,context):
    require(contract['mode']=='READ_ONLY_NATIVE_OPAQUE_PREFIX_SAMPLE' and contract['root']==str(ROOT)==context['root'],'Different page-sample mode/workspace')
    require(contract['sampleBounds']==BOUNDS and contract['pageSchedule']==[list(item) for item in PLAN],'Page sample bounds/schedule changed')
    require(contract['operationalFaultActionsAllowed'] is False,'Operational action flag refused')
    require(contract['orderingProfile']==PROFILE and contract['codepointOrderQualified'] is False,'Only the explicit opaque-order profile is accepted')
    require(context['jobId']==contract['jobId'] and context['resourceBytes']==896*MIB and context['cpuUnits']==1,'Wrong canonical sample grant')
    require(context['rootDevice']==ROOT.stat().st_dev and context['stateOwnerSha256']==contract['stateOwnerSha256'],'Canonical owner/mount changed')
    owner=context['mainOwner'];require(owner['status']=='active' and owner['containerId']==contract['containerId'] and owner['imageSha256']==contract['imageSha256'] and owner['resources']['memoryBytes']==2*1024**3 and owner['resources']['cpuUnits']==1.5 and owner['startedAt']==contract['registeredStartedAt'],'Main owner/epoch/caps changed')
    require(not context['otherActiveQJobs'],'Other Q work blocks the page sample')


def run(contract,context,docker,native,record):
    validate_context(contract,context)
    def owner(label):
        item=docker.inspect(contract['containerId']);safe={'containerId':item.get('Id'),'imageSha256':item.get('Image'),'running':item.get('State',{}).get('Running'),'startedAt':item.get('State',{}).get('StartedAt'),'memoryBytes':item.get('HostConfig',{}).get('Memory'),'nanoCpus':item.get('HostConfig',{}).get('NanoCpus'),'rawCommandEnvironment':'EXCLUDED'}
        record.write(label+'-observation',safe);return validate_inspection(contract,context,item,native.secret)
    before=record.step('owner-before',lambda:owner('owner-before'))
    owned=record.step('owned-processes',lambda:[{'containerId':item['Id'],'running':item['State']['Running']} for item in docker.owned(contract['ownerLabel'])]);require(all(not item['running'] or item['containerId']==contract['containerId'] for item in owned),'Another owned Q process is live')
    def profile(label):
        def stats():
            raw=native.request({'cmd':'stats'});return {key:raw.get(key) for key in ['version-server','git-hash-server']}
        def settings():
            raw=native.request({'cmd':'get-settings'});return {key:raw.get(key) for key in ['query-planning-budget','cache-max-size','cache-max-size-single-entry']}
        version=record.step(label+'-version',stats);actual=record.step(label+'-settings',settings)
        require(version=={'version-server':'v0.6.0','git-hash-server':'6c5861a'} and actual=={'query-planning-budget':'100','cache-max-size':'64 MB','cache-max-size-single-entry':'32 MB'},'Pinned native profile differs; no restoration runs')
        return {'version':version,'settings':actual}
    def activity(label):
        raw=native.active();value={'empty':not raw,'entries':len(raw),'replySha256':hashlib.sha256(canonical(raw)).hexdigest()};record.write(label+'-observation',value);require(not raw,'A native query is active');return value
    initial=profile('before');record.step('activity-before-1',lambda:activity('activity-before-1'));time.sleep(.1);record.step('activity-before-2',lambda:activity('activity-before-2'))
    deadline=time.monotonic()+BOUNDS['pageWindowSeconds'];measurements=[];populations={}
    for channel in ['named','default']:
        first,first_ids,first_keys=record.step(channel+'-first',lambda:native.page(channel,0,deadline),lambda value:value[0])
        second,second_ids,second_keys=record.step(channel+'-second',lambda:native.page(channel,256,deadline),lambda value:value[0])
        repeat,repeat_ids,_=record.step(channel+'-repeat-first',lambda:native.page(channel,0,deadline),lambda value:value[0])
        overlap=len(set(first_ids)&set(second_ids));boundary=first_keys[-1]<second_keys[0] if first_keys[-1] is not None and second_keys[0] is not None else None;same=first_ids==repeat_ids
        value={'firstTwoPageRows':512,'returnedRowsIncludingRepeat':768,'duplicateIdentitiesAcrossAdjacentPages':overlap,'strictCodepointBoundaryDiagnostic':boundary,'codepointOrderQualified':False,'orderingProfile':PROFILE,'repeatFirstCanonicalIdentical':same,'claim':'ONLY_OBSERVED_PREFIX_NO_UNREAD_TAIL_OR_WHOLE_SNAPSHOT_STABILITY'}
        record.write(channel+'-paging-check',value);require(overlap==0 and same,'Adjacent/repeated identity consistency check failed')
        populations[channel]=value;measurements.extend([first,second,repeat])
    final=profile('after');require(final==initial,'Native profile observations differ');record.step('activity-after',lambda:activity('activity-after'));after=record.step('owner-after',lambda:owner('owner-after'));require(after==before,'Owner/epoch observations differ')
    return {'format':'triplex-read-only-opaque-page-calibration/2','orderingProfile':PROFILE,'codepointOrderQualified':False,'measurements':measurements,'populations':populations,'priorCountObservationHistoricalOnly':contract.get('priorCountObservation'),'settingsBefore':initial,'settingsAfter':final,'pagesRequested':native.calls,'returnedRowsIncludingRepeats':1536,'rawReplyBytes':record.raw_bytes,'canonicalBytes':record.canonical_bytes,'gzipBytes':record.gzip_bytes,'metadataBytesBeforeFinalReport':record.metadata_bytes,'old200kContinuityCapUnchanged':True,'fullContinuityAttempted':False,'countsRequeried':False,'retryOrRecoveryAttempted':False,'claim':'BOUNDED_PREFIX_CALIBRATION_ONLY_NO_WHOLE_SNAPSHOT_ACK_SCALE_OR_PERFORMANCE_ACCEPTANCE'}


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--contract',type=Path,required=True);args=parser.parse_args();record=None
    artifacts=Path(os.environ['TRIPLEX_RUN_ARTIFACTS']).resolve(strict=True);require(artifacts.is_relative_to(ROOT/'.devloop/jobs'),'Unowned artifact directory')
    try:
        raw=read_file(args.contract,MIB);contract=json.loads(raw);data=sys.stdin.buffer.read(MIB+1);require(len(data)<=MIB,'Context exceeds1MiB');context=json.loads(data)
        require(context['contractSha256']==hashlib.sha256(raw).hexdigest(),'Frozen contract hash differs');validate_context(contract,context)
        selected=Path(sys.executable).resolve();require(str(selected)==contract['pythonRuntime']['path'],'Host Python selection differs')
        with selected.open('rb') as stream:require(hashlib.file_digest(stream,'sha256').hexdigest()==contract['pythonRuntime']['sha256'],'Selected host executable changed')
        credential=ROOT/'.runtime/engines/qlever-main/access-token';require(credential.stat().st_mode&0o777==0o600 and credential.stat().st_uid==os.getuid(),'Token must be owned0600');secret=read_file(credential,256).strip();require(32<=len(secret)<=256,'Invalid token carrier')
        record=Record(artifacts,secret);result=run(contract,context,ReadDocker(ROOT,contract['daemonId']),SampleQlever(secret,contract['namespace'],record),record)
        write_json(artifacts/'report.json',result,maximum=MIB)
        write_json(artifacts/'checks.json',{'format':'triplex-read-only-opaque-page-checks/2','sixClosedPages':True,'termChannelsAdjacentDuplicatesAndRepeatChecked':True,'orderingProfile':PROFILE,'codepointOrderQualified':False,'exactSafeRawAndCanonicalSizesRetained':True,'ownerAndSettingsUnchanged':True,'wholeContinuityAttempted':False,'readOnly':True},maximum=MIB)
    except Exception as error:
        write_json(artifacts/'failure.json',{'stage':None if record is None else record.stage,'error':safe_error(error),'policy':'FAIL_RETAIN_INCREMENTAL_SAFE_EVIDENCE_NO_RETRY_CANCELLATION_MUTATION_OR_RECOVERY'},maximum=MIB);raise SystemExit(1) from None


if __name__=='__main__':main()
