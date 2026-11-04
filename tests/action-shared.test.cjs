const assert=require('node:assert/strict'),cases=require('../dist/action-cases.json');
(async()=>{const {teamApi}=await import('../worker/team.mjs'),{DB}=await import('../scripts/d1-preview.mjs');
async function call(path,method='GET',data,user='admin'){const r=await teamApi(new Request('https://fn.test/api/team/'+path,{method,headers:{'oai-authenticated-user-id':user,Origin:'https://fn.test','Content-Type':'application/json'},body:data?JSON.stringify(data):undefined}),{DB});return {status:r.status,data:await r.json()}}
const t=await call('workspaces','POST',{name:'Action training',label:'Synthetic administrator',syntheticOnly:true});assert.equal(t.status,201);const q='?workspace='+t.data.id;
for(const role of ['physician','pharmacist','nurse']){const inv=await call('invite'+q,'POST',{role});await call('join','POST',{code:inv.data.code,label:'Synthetic '+role},role)}
const input=structuredClone(cases[4].input),id=crypto.randomUUID(),triageAt=new Date(Date.now()-600000).toISOString();
assert.equal((await call('visits'+q,'POST',{requestKey:id,syntheticOnly:true,caseCode:'SIM-A2A-05',triageAt,measurements:{},actionCaseId:'A2A-05',actionInput:input,actionExclusions:['source']},'nurse')).status,201);
let data=(await call('workspace'+q)).data,visit=data.visits.find(v=>v.id===id);assert.deepEqual(visit.snapshot.a2a.input,input);assert.equal(visit.snapshot.measurements.crcl,45);assert.deepEqual(visit.snapshot.a2a.exclusions,['source']);
const edit={id,revision:1,operationKey:crypto.randomUUID(),input:{...input,crcl:20},exclusions:[]};assert.equal((await call('assessment-action'+q,'POST',edit,'pharmacist')).status,403);assert.equal((await call('assessment-action'+q,'POST',edit,'outsider')).status,403);
assert.equal((await call('assessment-action'+q,'POST',{...edit,input:{age:4}},'nurse')).status,400);
assert.equal((await call('transition'+q,'POST',{id,revision:1,operationKey:crypto.randomUUID(),action:'submit_plan',plan:'Synthetic reviewed draft',note:'Pharmacist to verify'},'physician')).status,200);
assert.equal((await call('assessment-action'+q,'POST',edit,'nurse')).status,409,'Stale assessment must not overwrite review');
assert.equal((await call('assessment-action'+q,'POST',{...edit,revision:2},'nurse')).status,200);
data=(await call('workspace'+q)).data;visit=data.visits.find(v=>v.id===id);assert.equal(visit.stage,'physician_review');assert.equal(visit.revision,3);assert.equal(visit.snapshot.a2a.input.crcl,20);assert.equal(visit.snapshot.plan,null);assert.equal(visit.snapshot.pharmacy,null);assert.equal(visit.snapshot.dose,null);
const transition=(action,revision,extras={})=>({id,revision,operationKey:crypto.randomUUID(),action,note:'Synthetic reviewed handoff',...extras});
assert.equal((await call('transition'+q,'POST',transition('pharmacy_review',3),'pharmacist')).status,409,'Editing must force fresh physician review');
assert.equal((await call('transition'+q,'POST',transition('submit_plan',3,{plan:'Updated renal draft'}),'physician')).status,200);
assert.equal((await call('transition'+q,'POST',transition('pharmacy_review',4),'pharmacist')).status,200);
assert.equal((await call('transition'+q,'POST',transition('record_dose',5,{regimen:'Synthetic verified renal regimen',administeredAt:new Date().toISOString()}),'nurse')).status,200);
assert.equal((await call('assessment-action'+q,'POST',{...edit,revision:6,operationKey:crypto.randomUUID()},'nurse')).status,409,'Completed administration must be retained');
data=(await call('workspace'+q)).data;visit=data.visits.find(v=>v.id===id);assert.ok(visit.snapshot.dose);assert.ok(data.events.some(e=>e.action==='ASSESSMENT_UPDATED'));
console.log('PASS: full shared synthetic assessment, role isolation, input validation, optimistic concurrency, review invalidation, pharmacy/nursing progression and completed-dose preservation');
})().catch(e=>{console.error(e);process.exit(1)});
