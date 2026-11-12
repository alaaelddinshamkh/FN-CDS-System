const assert=require('node:assert/strict');
(async()=>{
const {accessApi,accessGuard}=await import('../worker/access.mjs'),{DB}=await import('../scripts/d1-preview.mjs');
const owner='00000000-0000-4000-8000-000000000001',fresh='00000000-0000-4000-8000-000000000002',legacy='00000000-0000-4000-8000-000000000003',repair='00000000-0000-4000-8000-000000000004';
const meta={username:'fresh.nurse',label:'Fictional nurse',externalId:'TEST-01',requestedRole:'nurse',syntheticOnly:true};
const makeUser=(id,email,metadata,confirmed=false)=>({id,email,email_confirmed_at:confirmed?'2026-01-01':null,user_metadata:metadata,identities:[{provider:'email',user_id:id}]});
let signupUser=makeUser(fresh,'fresh@example.test',meta),signups=0,pushes=0,confirmFresh=false;
const users={owner:makeUser(owner,'owner@example.test',{},true),fresh:signupUser,legacy:makeUser(legacy,'legacy@example.test',{...meta,username:'legacy.nurse'},true),repair:makeUser(repair,'repair@example.test',{...meta,username:'repair.nurse'},true)};
const vapid=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']),j=await crypto.subtle.exportKey('jwk',vapid.privateKey),raw=await crypto.subtle.exportKey('raw',vapid.publicKey);
const env={DB,FN_SUPERADMIN_UID:owner,SUPABASE_URL:'https://auth.test',SUPABASE_PUBLISHABLE_KEY:'public',VAPID_PUBLIC_KEY:Buffer.from(raw).toString('base64url'),VAPID_PRIVATE_KEY:j.d,VAPID_SUBJECT:'https://fn.test',AUTH_FETCH:async(url,init)=>{
 if(url.endsWith('/signup')){signups++;return Response.json({user:signupUser,access_token:'must-not-be-returned'})}
 if(url.includes('grant_type=password')){const r=JSON.parse(init.body),u=Object.values(users).find(x=>x.email===r.email);return u?Response.json({user:{...u,email_confirmed_at:'2026-01-01'},access_token:Object.keys(users).find(k=>users[k]===u),expires_in:3600}):Response.json({},{status:401})}
 const token=init.headers.Authorization?.replace('Bearer ','');const u=users[token];return u?Response.json({...u,email_confirmed_at:token==='fresh'?(confirmFresh?'2026-01-01':null):u.email_confirmed_at}):Response.json({},{status:401});
},PUSH_FETCH:async(url)=>{pushes++;assert.equal(url,'https://fcm.googleapis.com/fcm/send/test-owner');return new Response('',{status:201})}};
const key=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
const sub={endpoint:'https://fcm.googleapis.com/fcm/send/test-owner',keys:{p256dh:Buffer.from(await crypto.subtle.exportKey('raw',key.publicKey)).toString('base64url'),auth:Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64url')}};
await DB.prepare('INSERT INTO push_subscriptions (id,user_id,subscription,created_at) VALUES (?,?,?,?)').bind(sub.endpoint,owner,JSON.stringify(sub),'2026-01-01').run();
let counter=0;
const request=(path,method='GET',data,token='owner',origin='https://fn.test')=>new Request('https://fn.test/api/access/'+path,{method,headers:{Cookie:'__Host-fn_session='+token,Origin:origin,'CF-Connecting-IP':'test-'+counter++},body:data?JSON.stringify(data):undefined});
async function call(path,method='GET',data,token='owner',origin){const r=await accessApi(request(path,method,data,token,origin),env);return {status:r.status,data:await r.json(),headers:r.headers}}
const form={...meta,email:'fresh@example.test',password:'do-not-store-12345'};
assert.equal((await call('signup','POST',{...form,requestedRole:'superadmin'})).status,400);assert.equal(signups,0);
assert.equal((await call('signup','POST',form,'owner','https://evil.test')).status,403);
const registered=await call('signup','POST',form);assert.equal(registered.status,201);assert.equal(registered.data.registered,true);assert.equal(registered.data.emailConfirmationRequired,true);assert.equal(registered.data.access_token,undefined);assert.equal(registered.headers.get('set-cookie'),null);
assert.equal(pushes,1);const stored=await DB.prepare('SELECT * FROM access_accounts WHERE id=?').bind(fresh).first();assert.equal(stored.status,'approved');assert.equal(stored.role,'nurse');assert.equal(stored.username,meta.username);assert.ok(!JSON.stringify(stored).includes(form.password));
assert.equal((await call('request-summary')).data.pending,0);assert.equal((await call('requests')).data.accounts[0].id,fresh);
assert.equal((await call('session','GET',null,'fresh')).status,401);confirmFresh=true;assert.equal((await call('session','GET',null,'fresh')).data.status,'approved');
assert.equal((await call('request-summary','GET',null,'fresh')).status,403);
assert.ok((await accessGuard(new Request('https://fn.test/api/team/session',{headers:{Cookie:'__Host-fn_session=fresh'}}),env)).request);
assert.equal((await call('signup','POST',form)).status,409);assert.equal(pushes,1);assert.equal(signups,1);
// A concealed duplicate identity must not create a ghost request or change the real account.
signupUser={...signupUser,id:'00000000-0000-4000-8000-000000000099',identities:[]};assert.equal((await call('signup','POST',{...form,username:'different.alias'})).data.requestSubmitted,undefined);assert.equal((await call('request-summary')).data.pending,0);
// An existing real identity must retain its original role, alias and request.
signupUser=users.fresh;assert.equal((await call('signup','POST',{...form,username:'changed.alias',requestedRole:'physician'})).data.status,'check_account');assert.equal(pushes,1);assert.equal((await DB.prepare('SELECT requested_role FROM access_accounts WHERE id=?').bind(fresh).first()).requested_role,'nurse');
// Older signups recover their original metadata on authenticated sign-in, once.
assert.equal((await call('signin','POST',{login:'legacy@example.test',password:'irrelevant'})).status,200);assert.equal((await call('session','GET',null,'legacy')).data.status,'approved');assert.equal(pushes,2);
await call('signin','POST',{login:'legacy@example.test',password:'irrelevant'});assert.equal(pushes,2);
// Auth creation followed by failed D1 persistence gives an honest error, then sign-in repairs it.
signupUser=users.repair;let fail=true;env.DB={...DB,batch:async statements=>{if(fail){fail=false;throw Error('test persistence outage')}return DB.batch(statements)}};
assert.equal((await call('signup','POST',{...form,email:'repair@example.test',username:'repair.nurse'})).status,503);
assert.equal((await call('signin','POST',{login:'repair@example.test',password:'irrelevant'})).status,200);assert.equal((await call('session','GET',null,'repair')).data.status,'approved');assert.equal(pushes,3);
const pending=(await call('request-summary')).data.pending;
const reviewed=await call('review','POST',{id:fresh,revision:2,status:'approved',role:'patient',reason:'Synthetic test identity reviewed'});assert.equal(reviewed.status,200);assert.equal((await call('request-summary')).data.pending,pending);
console.log('PASS: signup activates an allowlisted training role without admin approval; owner-only registry and push; email verification, duplicate protection, recovery and persistence-failure repair');
})().catch(e=>{console.error(e);process.exit(1)});
