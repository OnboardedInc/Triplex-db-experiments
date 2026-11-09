// [CX-VRT01-R3] Why: execute emitted relational SQL in a real local interpreter rather than synthesize expected rows. Rejected: treating SQLite's dialect/storage as XTDB engine qualification.
import {DatabaseSync} from 'node:sqlite';
import {XtdbTransactionRejected} from '../../../../packages/xtdb/src/XtdbClient.js';
export function sqlTransport(){
 const db=new DatabaseSync(':memory:');const calls:any[]=[];
 const rewrite=(sql:string)=>sql.replace(/ FOR ALL VALID_TIME/g,'').replace(/TIMESTAMP WITH TIME ZONE '1970-01-01T00:00:00Z'/g,"'1970-01-01T00:00:00Z'").replace(/= ANY\((\$\d+)\)/g,'IN (SELECT value FROM json_each($1))');
 function run(sql:string,params:any[]=[],write=false):any[]{
  if(sql.includes('CROSS JOIN LATERAL')){
   // [CX-VRT01-R3] Why: SQLite lacks LATERAL; execute its correlated subquery for each SQL-derived span and then run the original coalescer. Rejected: deriving answers from a reference history.
   const [prefix,rest]=sql.split('), answers AS (');const [body,tail]=rest.split('), marked AS (');
   const inner=/CROSS JOIN LATERAL \(([\s\S]+)\) q/.exec(body)![1];const spans=run(prefix+') SELECT span_from, span_to FROM spans WHERE span_to IS NOT NULL',params);
   const columns=db.prepare(rewrite(inner.replaceAll('s.span_from','0'))).columns().map(c=>c.name);const names=[...columns,'span_from','span_to'];const quote=(v:string)=>'"'+v.replaceAll('"','""')+'"';
   db.exec('DROP TABLE IF EXISTS answers');db.exec('CREATE TEMP TABLE answers ('+names.map(quote).join(',')+')');
   for(const span of spans)for(const row of run(inner.replaceAll('s.span_from',String(span.span_from)),params))run('INSERT INTO answers VALUES ('+names.map(()=>'?').join(',')+')',[...columns.map(c=>row[c]),span.span_from,span.span_to],true);
   return run('WITH marked AS ('+tail);
  }
  const text=rewrite(sql);const statement=db.prepare(text);
  const bind=(v:any)=>typeof v==='boolean'?Number(v):v?.values?JSON.stringify(v.values):v;
  if(/\$\d+/.test(text)){
   const used=[...new Set(text.match(/\$\d+/g)??[])];const values=Object.fromEntries(used.map(n=>{let v=params[Number(n.slice(1))-1];if(text.includes('json_each('+n+')')&&typeof v==='string'&&v.startsWith('{'))v=JSON.stringify(JSON.parse('['+v.slice(1,-1)+']'));return[n,bind(v)];}));
   return write?(statement.run(values),[]):statement.all(values);
  }
  return write?(statement.run(...params.map(bind)),[]):statement.all(...params.map(bind));
 }
 const client:any={
  query:async(sql:string,params:any[]=[])=>{
   calls.push({kind:'query',sql,params});if(sql.includes('information_schema.tables'))return [];
   try{return run(sql,params);}catch(e){calls.push({kind:'query-error',error:String(e),sql});if(/no such table: (tx_meta|tx_query_generations|tx_query_members)/.test(String(e)))return [];throw e;}
  },
  submit:async(statements:any[])=>{
   calls.push({kind:'submit',statements});db.exec('BEGIN IMMEDIATE');
   try{
    for(const s of statements){
     if(s.sql.startsWith('CREATE TABLE')){
      const m=/CREATE TABLE (\w+) \((.+)\)/.exec(s.sql)!;const cols=m[2].split(',').map((p:string)=>p.trim());
      db.exec(`CREATE TABLE IF NOT EXISTS ${m[1]} (${cols.map((p:string)=>p==='_id'?'_id TEXT PRIMARY KEY':p).join(',')}, _valid_from)`);
     }else if(s.sql.startsWith('ASSERT ')){
      const expression=s.sql.slice(7).replace(/, '[^']+'$/,'');const observed=run('SELECT ('+expression+') AS allowed',s.params??[])[0];
      if(observed.allowed!==1)throw new XtdbTransactionRejected(new Error('triplex-cas-conflict'));
     }else if(s.sql.startsWith('INSERT INTO'))run(s.sql.replace('INSERT INTO','INSERT OR REPLACE INTO'),s.params??[],true);
     else throw new Error('Unsupported offline mutation: '+s.sql);
    }
    db.exec('COMMIT');return {};
   }catch(e){db.exec('ROLLBACK');throw e;}
  },close:async()=>{}
 };
 return{client,calls,db};
}
