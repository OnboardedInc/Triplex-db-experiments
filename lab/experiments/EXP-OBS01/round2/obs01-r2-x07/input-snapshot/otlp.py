# [EXP-OBS01] Why: decode retained OTLP protobuf with stdlib and exact fixed64 timestamps.
# Rejected: trusting exporter JSON or installing a parser whose dependencies are not pinned.
# Schema: opentelemetry-proto v1.5.0 trace/v1/trace.proto and common/v1/common.proto (Apache-2.0).
# https://github.com/open-telemetry/opentelemetry-proto/tree/v1.5.0/opentelemetry/proto
import struct

def pb_varint(data, pos):
    value=0
    for shift in range(0,70,7):
        if pos>=len(data): raise ValueError('truncated protobuf varint')
        b=data[pos];pos+=1;value|=(b&127)<<shift
        if b<128: return value,pos
    raise ValueError('oversized protobuf varint')

def pb_fields(data):
    result={};pos=0
    while pos<len(data):
        tag,pos=pb_varint(data,pos);field,wire=tag>>3,tag&7
        if not field: raise ValueError('zero protobuf field')
        if wire==0: value,pos=pb_varint(data,pos)
        elif wire in (1,5):
            size=8 if wire==1 else 4
            if pos+size>len(data): raise ValueError('truncated fixed protobuf')
            value=data[pos:pos+size];pos+=size
        elif wire==2:
            size,pos=pb_varint(data,pos)
            if size>8*1024*1024 or pos+size>len(data): raise ValueError('truncated protobuf message')
            value=data[pos:pos+size];pos+=size
        else: raise ValueError('unsupported protobuf wire type')
        result.setdefault(field,[]).append((wire,value))
    return result

def pb_one(fields, number, wire, default=None):
    values=fields.get(number,[])
    if not values: return default
    if len(values)!=1 or values[0][0]!=wire: raise ValueError('duplicate or wrong protobuf scalar')
    return values[0][1]

def pb_any(data, depth=0):
    if depth>16: raise ValueError('attribute nesting limit')
    fields=pb_fields(data)
    if len(fields)!=1: raise ValueError('ambiguous AnyValue')
    n=next(iter(fields))
    if n==1: return pb_one(fields,1,2).decode('utf8')
    if n==2: return bool(pb_one(fields,2,0))
    if n==3:
        v=pb_one(fields,3,0)
        return v-(1<<64) if v&(1<<63) else v
    if n==4: return struct.unpack('<d',pb_one(fields,4,1))[0]
    if n==7: return {'hex':pb_one(fields,7,2).hex()}
    if n in (5,6):
        inner=pb_fields(pb_one(fields,n,2))
        if n==5: return [pb_any(v,depth+1) for w,v in inner.get(1,[]) if w==2]
        return pb_attributes(inner.get(1,[]),depth+1)
    raise ValueError('unknown AnyValue')

def pb_attributes(values,depth=0):
    result={}
    for wire,data in values:
        if wire!=2: raise ValueError('invalid attribute')
        fields=pb_fields(data);key=pb_one(fields,1,2).decode('utf8')
        if key in result: raise ValueError('duplicate span attribute')
        result[key]=pb_any(pb_one(fields,2,2),depth)
    return result

def otlp_spans(data):
    result=[]
    for wire,rs in pb_fields(data).get(1,[]):
        if wire!=2: raise ValueError('resource spans wire')
        for wire,scope in pb_fields(rs).get(2,[]):
            if wire!=2: raise ValueError('scope spans wire')
            for wire,span in pb_fields(scope).get(2,[]):
                if wire!=2: raise ValueError('span wire')
                f=pb_fields(span)
                start=struct.unpack('<Q',pb_one(f,7,1))[0];end=struct.unpack('<Q',pb_one(f,8,1))[0]
                trace=pb_one(f,1,2);sid=pb_one(f,2,2)
                if end<start or len(trace)!=16 or len(sid)!=8 or not any(trace) or not any(sid): raise ValueError('invalid span identity/time')
                result.append({'traceId':trace.hex(),'spanId':sid.hex(),'parentSpanId':pb_one(f,4,2,b'').hex(),
                    'name':pb_one(f,5,2,b'').decode('utf8'),'startUnixNs':start,'endUnixNs':end,'attributes':pb_attributes(f.get(9,[]))})
    return result
