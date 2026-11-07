import assert from 'node:assert/strict';

// The emitted production program uses ordinary SQL strings/identifiers and
// comments, not dollar quotes. In particular its record literal has semicolons.
export function splitPatchSql(sql){
  assert.equal(typeof sql,'string');
  const statements=[];let start=0,state='normal';
  for(let index=0;index<sql.length;index++){
    const char=sql[index],next=sql[index+1];
    if(state==='line'){if(char==='\n')state='normal';continue;}
    if(state==='comment'){if(char==='*'&&next==='/'){state='normal';index++;}continue;}
    if(state==='single'||state==='double'){
      const quote=state==='single'?"'":'"';
      if(char===quote){if(next===quote)index++;else state='normal';}continue;
    }
    if(char==='-'&&next==='-'){state='line';index++;}
    else if(char==='/'&&next==='*'){state='comment';index++;}
    else if(char==="'")state='single';
    else if(char==='"')state='double';
    else if(char===';'){const statement=sql.slice(start,index).trim();if(statement)statements.push(statement);start=index+1;}
    else assert.notEqual(char,'$','Unexpected dollar quote/parameter in emitted patch SQL');
  }
  assert.ok(state==='normal'||state==='line','Unclosed SQL token');
  const trailing=sql.slice(start).trim();if(trailing)statements.push(trailing);
  assert.ok(statements.length>20,'Expected the full production patch program');
  assert.match(statements[0],/^CREATE TEMP TABLE __td_native_owner_guard\b/);
  assert.match(statements.at(-1),/^WITH owner_guard\b/);
  return statements;
}

export function patchPhase(sql){
  const create=/^CREATE TEMP TABLE (\w+)\b/i.exec(sql);
  if(create)return create[1].replace('__td_native_','');
  const write=/^(INSERT INTO|UPDATE|DROP TABLE)\s+([\w.]+)/i.exec(sql);
  if(write)return write[1].toLowerCase().replaceAll(' ','_')+':'+write[2];
  assert.match(sql,/^WITH owner_guard\b/);return 'receipt';
}

export function profileOperators(profile){
  assert.ok(Array.isArray(profile.operator)&&profile.operator.length,'Expected pinned DuckDB 2.0 operators');
  const result=[];
  function visit(node,path){
    assert.equal(typeof node.type,'string');
    assert.ok(Number.isFinite(node.timing)&&node.timing>=0);
    result.push({path,type:node.type,timingMs:node.timing*1000,
      rowsProduced:node.intermediate_rows??null,rowsScanned:node.rows_scanned??null,detail:node.extra_info??{}});
    for(const [index,child] of (node.children??[]).entries())visit(child,path+'.'+index);
  }
  for(const [index,node] of profile.operator.entries())visit(node,String(index));
  return result;
}
