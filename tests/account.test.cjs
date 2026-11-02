const assert=require('node:assert/strict');
(async()=>{const {teamApi}=await import('../worker/team.mjs'),{DB}=await import('../scripts/d1-preview.mjs');
async function call(path,method='GET',data,user='profile-user',origin='https://fn.test'){const r=await teamApi(new Request('https://fn.test/api/team/'+path,{method,headers:{...(user?{'oai-authenticated-user-id':user}:{}),Origin:origin},body:data?JSON.stringify(data):undefined}),{DB});return {status:r.status,data:await r.json()}}
assert.equal((await call('profile','GET',null,'')).status,401);
assert.equal((await call('profile')).data.profile,null);
const p={username:'demo.patient',requestedRole:'patient',syntheticOnly:true};
assert.equal((await call('profile','POST',p,'profile-user','https://evil.test')).status,403);
assert.equal((await call('profile','POST',{...p,requestedRole:'superadmin'})).status,400);
assert.equal((await call('profile','POST',p)).status,201);
assert.equal((await call('profile')).data.profile.username,p.username);
assert.equal((await call('profile','POST',{...p,requestedRole:'physician'})).status,409);
assert.equal((await call('profile','POST',p,'duplicate-user')).status,409);
assert.deepEqual((await call('session')).data.workspaces,[]);
assert.equal((await call('workspaces','POST',{name:'No',label:'No',syntheticOnly:true})).status,403);
assert.equal((await call('workspace?workspace=other')).status,403);
assert.equal((await call('profile','POST',{...p,username:'demo.doctor',requestedRole:'physician'},'physician-applicant')).status,201);
assert.equal((await call('workspace?workspace=other','GET',null,'physician-applicant')).status,403);
console.log('PASS: protected profile, unique alias, immutable requested role, no self-assigned clinician access, patient workspace isolation');
})().catch(e=>{console.error(e);process.exit(1)});
