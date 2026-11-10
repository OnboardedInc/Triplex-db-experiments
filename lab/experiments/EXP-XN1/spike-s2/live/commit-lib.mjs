// [XN-S2-LIVE] Why: reuse S1's one-ASSERT atomic command for sustained Q2 writers. Rejected: substituting a lone INSERT.
import {text,int} from './wire.mjs';
const p=(sql,params=[])=>({sql,params});
const payload=[3000,200,4000].map(n=>'w'.repeat(n));
export function command(id,subj,expected,docPrefix=id){
 const guards=true?[p("ASSERT NOT EXISTS (SELECT 1 FROM xn_claim WHERE _id=$1) AND (SELECT pos FROM xn_head WHERE _id=$2) = $3, 'guard'",[text(id),text(subj),int(expected)])]:[
 p("ASSERT NOT EXISTS (SELECT 1 FROM xn_claim WHERE _id=$1), 'duplicate-command'",[text(id)]),
 p("ASSERT (SELECT pos FROM xn_head WHERE _id=$1) = $2, 'stale-position'",[text(subj),int(expected)])];
 const params=[];const rows=payload.map((d,i)=>{params.push(text(`${docPrefix}-${i}`),text(d));return `($${i*2+1},$${i*2+2})`});
 return [p('BEGIN READ WRITE'),...guards,p(`INSERT INTO xn_ent (_id,doc) VALUES ${rows.join(',')}`,params),p('INSERT INTO xn_head (_id,pos) VALUES ($1,$2)',[text(subj),int(expected+1)]),p('INSERT INTO xn_claim (_id) VALUES ($1)',[text(id)]),p('COMMIT SYNC')];
}
