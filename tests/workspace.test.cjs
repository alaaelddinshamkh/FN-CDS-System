const test=require('node:test'),assert=require('node:assert/strict'),core=require('../dist/workspace-core.js');
const at=n=>new Date(n*60000).toISOString();
const ep=(over={})=>({patientId:'FN-001',label:'Fictional case',mode:'recorded',tasks:[{id:'t1',title:'Review',ownerRole:'physician',ownerLabel:'Unassigned physician',status:'proposed',dueAt:at(5)}],alerts:[],tests:[],...over});
test('queue distinguishes role queues, actual individual assignment, completion and overdue deadlines',()=>{
 const local=ep();const shared=ep({tasks:[{...local.tasks[0],ownerLabel:'Operator A'},{...local.tasks[0],id:'done',status:'completed'},{...local.tasks[0],id:'cancelled',status:'cancelled'},{...local.tasks[0],id:'no-time',dueAt:null}]});
 const q=core.queue({episodes:[local,ep({mode:'simulation'})],visits:[{id:'v1',case_code:'FN-001',stage:'physician_review',snapshot:{dynamic:shared}}],operator:{role:'physician',label:'Operator A'},escalations:[{status:'closed'},{status:'acknowledged'}],now:6*60000});
 assert.equal(q.tasks.length,3);assert.equal(q.counts.mine,1);assert.equal(q.counts.overdue,2);assert.equal(q.counts.escalation,1);assert.equal(q.tasks.find(t=>t.scope==='local').mine,false);assert.equal(q.tasks.find(t=>t.id==='no-time').overdue,false);
});
test('review counters retain acknowledged changes without a clinical decision',()=>{
 const d=ep({tasks:[],alerts:[{id:'a',reason:'Changed renal result',review:{at:at(8)},decision:null}],tests:[{id:'culture',name:'Culture',latest:{code:'culture',ack:{at:at(8)},decision:null,status:'final'}}]});
 const q=core.queue({episodes:[d]});assert.equal(q.counts.review,2);assert.match(q.reviews[0].kind,/Decision/);
});
test('result projection uses one current report and review state per patient and encounter',()=>{
 const source=[{patientId:'FN-001',eventId:'old',accession:'acc',code:'ANC',value:.4,status:'final',issuedAt:at(1)},{patientId:'FN-001',eventId:'new',accession:'acc',code:'ANC',value:.2,status:'corrected',issuedAt:at(2)},{patientId:'FN-002',eventId:'different',accession:'acc',code:'ANC',value:.8,status:'final',issuedAt:at(2)}];
 const d=ep({tests:[{id:'t',latest:{id:'result-new',accession:'acc',code:'ANC',status:'corrected',value:.2,availableAt:at(2),ack:{at:at(3)}}}]});
 const visits=[{id:'visit-a',snapshot:{dynamic:ep({tests:[{id:'t',latest:{id:'shared',accession:'acc',code:'ANC',status:'final',value:.9,availableAt:at(1),ack:null}}]})}},{id:'visit-b',snapshot:{dynamic:ep({tests:[{id:'t',latest:{id:'other',accession:'acc',code:'ANC',status:'final',value:.7,availableAt:at(1),ack:null}}]})}}];
 const results=core.results({source,episodes:[d],visits,reviews:{old:'reviewed'}});assert.equal(results.length,4);assert.equal(results.find(r=>r.patientId==='FN-001'&&r.scope==='local').reviewed,true);assert.equal(results.find(r=>r.visitId==='visit-a').value,.9);assert.equal(results.find(r=>r.patientId==='FN-002').reviewed,false);assert.equal(source.length,3);
});
test('undated source values remain undated and simulation reports do not appear as recorded care',()=>{
 const rows=core.results({source:[{patientId:'FN-001',eventId:'baseline',accession:'x',code:'ANC',value:.2,observedAt:null,issuedAt:null}],episodes:[ep({mode:'simulation',tests:[{latest:{accession:'x',code:'ANC',value:99}}]})]});assert.equal(rows.length,1);assert.equal(rows[0].issuedAt,null);assert.equal(rows[0].observedAt,null);assert.equal(rows[0].reviewed,false);
});
