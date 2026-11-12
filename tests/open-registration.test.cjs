const assert=require('node:assert/strict');
(async()=>{
const {accessApi,accessGuard}=await import('../worker/access.mjs'),{DB}=await import('../scripts/d1-preview.mjs'),{queries,liveQueryCount}=await import('../worker/query-catalog.mjs');
const person={id:'00000000-0000-4000-8000-000000000071',email:'training@example.test',email_confirmed_at:'2026-01-01',identities:[{provider:'email',user_id:'00000000-0000-4000-8000-000000000071'}]};
const env={DB,FN_SUPERADMIN_UID:'owner',SUPABASE_URL:'https://auth.test',SUPABASE_PUBLISHABLE_KEY:'public',AUTH_FETCH:async(url)=>url.endsWith('/signup')||url.includes('grant_type=password')?Response.json({user:person,access_token:'training',expires_in:3600}):Response.json(person)};
let i=0;const req=(path,body)=>new Request('https://fn.test/api/access/'+path,{method:'POST',headers:{Origin:'https://fn.test',Cookie:'__Host-fn_session=training','CF-Connecting-IP':'open-test-'+i++},body:JSON.stringify(body)});
// Exercise the Postgres allowlist as well as local SQL, without changing its deployed catalog.
const base=env.DB;env.DB={prepare(q){assert.ok(queries.slice(0,liveQueryCount).includes(q),'Query must already exist in the deployed live catalog');return base.prepare(q)},batch:s=>base.batch(s)};
const form={email:person.email,password:'SyntheticOnly-12345',username:'open.training',label:'Fictional trainee',requestedRole:'nurse',externalId:'SIM-71',syntheticOnly:true};
let r=await accessApi(req('signup',form),env),data=await r.json();assert.equal(r.status,201);assert.equal(data.registered,true);assert.equal(data.signedIn,true);assert.match(r.headers.get('set-cookie'),/HttpOnly; Secure/);assert.equal(data.access_token,undefined);
let a=await DB.prepare('SELECT * FROM access_accounts WHERE id=?').bind(person.id).first();assert.equal(a.status,'approved');assert.equal(a.role,'nurse');assert.equal(a.workspace_id,null);assert.equal(a.patient_visit_id,null);assert.ok(a.created_at);
let session=new Request('https://fn.test/api/access/requests',{headers:{Cookie:'__Host-fn_session=training'}});assert.equal((await accessApi(session,env)).status,403);
// Simulate an older pending signup. A verified password sign-in activates it once.
await DB.prepare('UPDATE access_accounts SET status=?,role=?,workspace_id=?,patient_visit_id=?,reviewed_at=?,reviewed_by=?,reason=?,revision=revision+1 WHERE id=? AND revision=?').bind('pending',null,null,null,null,null,null,a.id,a.revision).run();
assert.equal((await accessApi(req('signin',{login:person.email,password:'SyntheticOnly-12345'}),env)).status,200);
a=await DB.prepare('SELECT * FROM access_accounts WHERE id=?').bind(person.id).first();assert.equal(a.status,'approved');assert.equal(a.role,'nurse');assert.equal(a.workspace_id,null);
// Open registration must never reactivate a suspended account or grant owner privileges.
await DB.prepare('UPDATE access_accounts SET status=?,role=?,workspace_id=?,patient_visit_id=?,reviewed_at=?,reviewed_by=?,reason=?,revision=revision+1 WHERE id=? AND revision=?').bind('suspended',a.role,null,null,'2026-01-01','owner','test suspension',a.id,a.revision).run();
await accessApi(req('signin',{login:person.email,password:'SyntheticOnly-12345'}),env);
a=await DB.prepare('SELECT * FROM access_accounts WHERE id=?').bind(person.id).first();assert.equal(a.status,'suspended');assert.equal((await accessGuard(new Request('https://fn.test/api/team/session',{headers:{Cookie:'__Host-fn_session=training'}}),env)).response.status,403);
assert.equal((await accessApi(req('signup',{...form,username:'admin.attempt',requestedRole:'superadmin'}),env)).status,400);
console.log('PASS: immediate active registration, protected session cookie, owner-only registry, no shared-record grants, legacy activation, suspension preservation and deployed SQL-catalog compatibility');
})().catch(e=>{console.error(e);process.exit(1)});
