"""Independent DELTA comparisons using the frozen O-DOMAIN interpreter, including the census complement."""
import hashlib
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[3] / 'oracles' / 'domain'))
import w0
from jsontok import canonical

def projection(output):
    result = {}
    for table in ('tasks', 'obligations', 'flags', 'workItems'):
        for item in output[table]:
            ident = item.get('id', item.get('name'))
            key = item.get('key', '')
            if table != 'workItems' and item['rule'] in ('DOCEXP', 'PROP'):
                parts = ident.removesuffix('@due').split('#', 2)
                key = parts[2] if len(parts) == 3 else ''
            value = ({k: item[k] for k in ('rule','kind','key','payload')} if table == 'workItems' else item)
            result[canonical([output['subject'], item['rule'], key, 'work' if table == 'workItems' else table, ident])] = canonical(value)
    return result

def digest(rows):
    return hashlib.sha256(canonical(rows).encode()).hexdigest()

def compare(req):
    b = req['basis']
    releases = [w0.Release(doc) for doc in req['releases']]
    result = [[] for _ in req['pairs']]
    for world in req['worlds']:
        ix = w0.validate_world(world, b['tx'])
        views = [projection(w0.evaluate_indexed(ix, r, b['tx'], b['validTime'])) for r in releases]
        for rows, (a,z) in zip(result, req['pairs']):
            x,y = views[a],views[z]
            rows.extend([k,x.get(k),y.get(k)] for k in sorted(x.keys() | y.keys()) if x.get(k) != y.get(k))
    return [{'sha':digest(sorted(rows)), 'rows':len(rows),
             'keys':sorted({canonical(json.loads(row[0])[:3]) for row in rows})} for rows in result]

if __name__ == '__main__':
    for line in sys.stdin:
        print(json.dumps(compare(json.loads(line)), separators=(',',':')), flush=True)
