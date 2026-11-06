/* Supabase authenticates passwords. D1 stores approval and role assignments, never passwords. */
const accessRoles=['physician','nurse','pharmacist','patient'];
const accessJSON=(v,status=200,extra={})=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...extra}});
const accessClean=(s,n=100)=>typeof s==='string'?s.trim().slice(0,n):'';
const accessCookie=(token,seconds=3600)=>'__Host-fn_session='+token+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age='+seconds;
async function accessBody(request){const s=await request.text();if(s.length>12000)throw Error('Request too large');return JSON.parse(s)}
async function accessProvider(env,path,method='GET',data,token){return (env.AUTH_FETCH||fetch)(env.SUPABASE_URL+'/auth/v1/'+path,{method,headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,...(token?{Authorization:'Bearer '+token}:{}),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(15000)})}
async function accessPrincipal(request,env){
 if(!env.SUPABASE_URL||!env.SUPABASE_PUBLISHABLE_KEY||!env.FN_SUPERADMIN_UID||!env.DB)return null;
 const token=(request.headers.get('Cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('__Host-fn_session='))?.slice(18);if(!token||token.length>8000)return null;
 const r=await accessProvider(env,'user','GET',null,token);if(r.status===429||r.status>=500)throw Error('Identity service temporarily unavailable');if(!r.ok)return null;const u=await r.json();if(!u.id||!u.email_confirmed_at)return null;
 const owner=u.id===env.FN_SUPERADMIN_UID;
 if(owner)return {id:u.id,user:'sb:'+u.id,email:u.email,role:'superadmin',status:'approved',owner:true,token};
 const account=await env.DB.prepare('SELECT * FROM access_accounts WHERE id=?').bind(u.id).first();return {id:u.id,user:'sb:'+u.id,email:u.email,owner:false,account,role:account?.role,status:account?.status||'unregistered',token,metadata:u.user_metadata||{}};
}
async function accessLimit(request,env,kind){const ip=request.headers.get('CF-Connecting-IP')||'unknown';const raw=kind+':'+Math.floor(Date.now()/900000)+':'+ip;const key=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw)))).map(x=>x.toString(16).padStart(2,'0')).join('');await env.DB.prepare('INSERT INTO access_limits (key,count) VALUES (?,1) ON CONFLICT(key) DO UPDATE SET count=count+1').bind(key).run();const row=await env.DB.prepare('SELECT count FROM access_limits WHERE key=?').bind(key).first();return row.count<=(kind==='signup'?8:40)}
function accessPublic(p){if(!p)return {signedIn:false};if(p.owner)return {signedIn:true,role:'superadmin',status:'approved',label:'Application owner',email:p.email};const a=p.account;return {signedIn:true,email:p.email,role:p.role,status:p.status,account:a?{username:a.username,label:a.label,requestedRole:a.requested_role,externalId:a.external_id,status:a.status,role:a.role,reason:a.reason}:null}}
async function accessNotifyOwner(env){
 try{const {msgPush}=await import('./messaging.mjs');return await msgPush(env,env.FN_SUPERADMIN_UID,crypto.randomUUID(),'registration')}catch{return {accepted:0,configured:!!env.VAPID_PUBLIC_KEY,failed:1}}
}
async function accessRecoverRequest(env,user){
 if(!user?.id||!user.email_confirmed_at||user.id===env.FN_SUPERADMIN_UID)return;
 if(await env.DB.prepare('SELECT id FROM access_accounts WHERE id=?').bind(user.id).first())return;
 const meta=user.user_metadata||{};
 // Only identity-provider returned metadata of a password-authenticated user is used.
 const saved=await accessEnroll(env,{id:user.id,email:user.email},meta);
 if(saved.status===201)await accessNotifyOwner(env);
}
async function accessEnroll(env,p,r){
 const username=accessClean(r.username,32).toLowerCase(),label=accessClean(r.label),externalId=accessClean(r.externalId,60),role=r.requestedRole;
 if(!/^[a-z][a-z0-9_.-]{2,31}$/.test(username)||!label||!externalId||!accessRoles.includes(role)||r.syntheticOnly!==true)return accessJSON({error:'Enter a name, 3–32 character username, staff/patient ID, role and synthetic-only confirmation.'},400);
 const existing=await env.DB.prepare('SELECT id,status FROM access_accounts WHERE id=?').bind(p.id).first();if(existing)return accessJSON({ok:true,status:existing.status,duplicate:true});
 const old=await env.DB.prepare('SELECT id FROM access_accounts WHERE username=?').bind(username).first();if(old)return accessJSON({error:'Username unavailable. Choose another.'},409);
 const now=new Date().toISOString();await env.DB.batch([env.DB.prepare('INSERT INTO access_accounts (id,email,username,label,requested_role,external_id,status,revision,created_at) VALUES (?,?,?,?,?,?,?,1,?)').bind(p.id,p.email.toLowerCase(),username,label,role,externalId,'pending',now),env.DB.prepare('INSERT INTO access_events (id,actor_id,target_id,action,note,at) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),p.id,p.id,'REGISTRATION_REQUESTED',role,now)]);return accessJSON({ok:true,status:'pending'},201);
}
async function accessApi(request,env){
 const u=new URL(request.url),path=u.pathname.replace('/api/access/','');
 if(request.method!=='GET'&&request.headers.get('Origin')!==u.origin)return accessJSON({error:'Same-origin request required.'},403);
 if(!env.DB||!env.SUPABASE_URL||!env.SUPABASE_PUBLISHABLE_KEY||!env.FN_SUPERADMIN_UID)return accessJSON({error:'Independent account service is not configured.'},503);
 try{
 if(path==='status'&&request.method==='GET'){const r=await accessProvider(env,'settings');if(!r.ok)return accessJSON({ready:false,error:'Authentication provider configuration could not be verified.'},503);const s=await r.json();return accessJSON({ready:true,emailPasswordEnabled:!!s.external?.email,emailConfirmationRequired:!s.mailer_autoconfirm})}
 if(path==='signup'&&request.method==='POST'){
  if(!await accessLimit(request,env,'signup'))return accessJSON({error:'Too many registration attempts. Try again in 15 minutes.'},429);
  const r=await accessBody(request);if(typeof r.email!=='string'||!/^\S+@\S+\.\S+$/.test(r.email)||typeof r.password!=='string'||r.password.length<12||r.password.length>256||!accessRoles.includes(r.requestedRole)||r.syntheticOnly!==true||!/^[a-z][a-z0-9_.-]{2,31}$/i.test(r.username)||!accessClean(r.label)||!accessClean(r.externalId))return accessJSON({error:'Complete all fields. Use a password of at least 12 characters.'},400);
  const username=r.username.toLowerCase(),email=r.email.trim().toLowerCase();
  // Check aliases before creating Auth credentials; repeat the unique check during persistence.
  const alias=await env.DB.prepare('SELECT id FROM access_accounts WHERE username=?').bind(username).first();
  if(alias)return accessJSON({error:'Username unavailable. If you already registered, sign in instead.'},409);
  const response=await accessProvider(env,'signup','POST',{email,password:r.password,data:{username,label:accessClean(r.label),requestedRole:r.requestedRole,externalId:accessClean(r.externalId,60),syntheticOnly:true}});if(!response.ok)return accessJSON({error:'Registration could not complete. Check the email/password requirements or sign in if you already registered.'},400);
  const result=await response.json(),user=result.user||result;
  // Supabase may return an obfuscated user for a duplicate email. Never enqueue it.
  const realIdentity=typeof user.id==='string'&&/^[0-9a-f-]{36}$/i.test(user.id)&&user.email?.toLowerCase()===email&&Array.isArray(user.identities)&&user.identities.some(i=>i.provider==='email'&&i.user_id===user.id);
  if(!realIdentity||user.id===env.FN_SUPERADMIN_UID)return accessJSON({ok:true,status:'check_account',message:'If this email is already registered, sign in with your existing password. Otherwise check your confirmation email. No new approval request was confirmed.'});
  try{
   const saved=await accessEnroll(env,{id:user.id,email},r),data=await saved.json();
   if(!saved.ok)return accessJSON({error:'Your login account was created, but the approval request could not be saved. Sign in with your email to recover it. '+(data.error||'')},409);
   if(data.duplicate)return accessJSON({ok:true,status:'check_account',message:'Your account already has a registration request. Sign in with your existing credentials to see its current status.'});
   await accessNotifyOwner(env);
   return accessJSON({ok:true,status:data.status,requestSubmitted:true,emailConfirmationRequired:!user.email_confirmed_at,message:'Your request has been sent to the administrator. Wait for approval. '+(!user.email_confirmed_at?'Confirm your email before your first sign-in; your request is already in the approval inbox.':'After approval, sign in with your username or email and password.')},201);
  }catch{return accessJSON({error:'Your login account was created, but saving the approval request is unconfirmed. Sign in with your email to recover it; do not create another account.'},503)}
 }
 if(path==='signin'&&request.method==='POST'){
  if(!await accessLimit(request,env,'signin'))return accessJSON({error:'Too many sign-in attempts. Try again in 15 minutes.'},429);
  const r=await accessBody(request),login=accessClean(r.login,254).toLowerCase();if(!login||typeof r.password!=='string'||r.password.length>256)return accessJSON({error:'Invalid email / username or password.'},400);
  const lookup=login.includes('@')?null:await env.DB.prepare('SELECT email FROM access_accounts WHERE username=?').bind(login).first();const email=login.includes('@')?login:lookup?.email||'unknown-user@invalid.example';
  const response=await accessProvider(env,'token?grant_type=password','POST',{email,password:r.password});if(!response.ok)return accessJSON({error:'Sign-in failed. Check email / username, password and email confirmation.'},401);
  const s=await response.json();if(!s.access_token||!s.user?.email_confirmed_at)return accessJSON({error:'Verify your email before signing in.'},403);
  await accessRecoverRequest(env,s.user);
  return accessJSON({ok:true},200,{'Set-Cookie':accessCookie(s.access_token,Math.min(Number(s.expires_in)||3600,3600))});
 }
 if(path==='signout'&&request.method==='POST'){const p=await accessPrincipal(request,env);if(p){await env.DB.prepare('DELETE FROM push_subscriptions WHERE user_id=?').bind(p.id).run();await accessProvider(env,'logout','POST',{},p.token);}return accessJSON({ok:true},200,{'Set-Cookie':accessCookie('',0)})}
 const p=await accessPrincipal(request,env);if(!p)return accessJSON({error:'Sign in with your application account.'},401);
 if(path==='session'&&request.method==='GET')return accessJSON(accessPublic(p));
 if(path==='enroll'&&request.method==='POST'){if(p.owner||p.account)return accessJSON({error:'Account request already exists.'},409);const saved=await accessEnroll(env,p,await accessBody(request));if(saved.status===201)await accessNotifyOwner(env);return saved}
 if(path==='patient'&&request.method==='GET'){
  if(p.status!=='approved'||p.role!=='patient')return accessJSON({error:'Approved patient account required.'},403);
  const v=p.account.patient_visit_id?await env.DB.prepare('SELECT case_code,stage,snapshot FROM team_visits WHERE id=? AND team_id=?').bind(p.account.patient_visit_id,p.account.workspace_id).first():null;
  if(!v)return accessJSON({linked:false});const s=JSON.parse(v.snapshot);return accessJSON({linked:true,caseCode:v.case_code,stage:v.stage,triageAt:s.triageAt,dose:s.dose?{regimen:s.dose.regimen,administeredAt:s.dose.administeredAt}:null,syntheticOnly:true});
 }
 if(!p.owner)return accessJSON({error:'Super Admin access required.'},403);
 if(path==='request-summary'&&request.method==='GET'){const row=await env.DB.prepare("SELECT COUNT(*) AS n FROM access_accounts WHERE status='pending'").first();return accessJSON({pending:row.n})}
 if(path==='requests'&&request.method==='GET'){
  const [accounts,events,teams,visits]=await Promise.all([env.DB.prepare("SELECT * FROM access_accounts ORDER BY (status='pending') DESC,created_at DESC LIMIT 200").all(),env.DB.prepare('SELECT * FROM access_events ORDER BY at DESC LIMIT 100').all(),env.DB.prepare('SELECT id,name FROM demo_teams ORDER BY created_at DESC').all(),env.DB.prepare('SELECT id,team_id,case_code FROM team_visits ORDER BY updated_at DESC LIMIT 200').all()]);return accessJSON({accounts:accounts.results,events:events.results,teams:teams.results,visits:visits.results,emailNotifications:false});
 }
 if(path==='review'&&request.method==='POST'){
  const r=await accessBody(request);if(r.id===env.FN_SUPERADMIN_UID||!['approved','rejected','suspended'].includes(r.status)||!Number.isInteger(r.revision)||!accessClean(r.reason,600))return accessJSON({error:'Valid decision, current revision and reason required. Owner access cannot be changed here.'},400);
  const a=await env.DB.prepare('SELECT * FROM access_accounts WHERE id=?').bind(r.id).first();if(!a)return accessJSON({error:'Account not found.'},404);if(a.revision!==r.revision)return accessJSON({error:'Request changed. Refresh before reviewing.'},409);
  const role=r.status==='approved'?r.role:a.role;if(r.status==='approved'&&!accessRoles.includes(role))return accessJSON({error:'Select an allowed role.'},400);
  const team=r.status==='approved'?accessClean(r.workspaceId):a.workspace_id;const visit=r.status==='approved'&&role==='patient'?accessClean(r.patientVisitId):null;
  if(r.status==='approved'&&role!=='patient'&&!team)return accessJSON({error:'Select a workspace for the staff account.'},400);
  if(team&&!await env.DB.prepare('SELECT id FROM demo_teams WHERE id=?').bind(team).first())return accessJSON({error:'Workspace not found.'},400);
  if(visit&&!await env.DB.prepare('SELECT id FROM team_visits WHERE id=? AND team_id=?').bind(visit,team).first())return accessJSON({error:'Patient visit must belong to the selected workspace.'},400);
  const now=new Date().toISOString(),eventId=crypto.randomUUID();const results=await env.DB.batch([
   env.DB.prepare('UPDATE access_accounts SET status=?,role=?,workspace_id=?,patient_visit_id=?,reviewed_at=?,reviewed_by=?,reason=?,revision=revision+1 WHERE id=? AND revision=?').bind(r.status,role||null,team||null,visit||null,now,p.id,accessClean(r.reason,600),a.id,r.revision),
   env.DB.prepare('INSERT INTO access_events (id,actor_id,target_id,action,note,at) SELECT ?,?,?,?,?,? FROM access_accounts WHERE id=? AND revision=? AND reviewed_at=? AND reviewed_by=?').bind(eventId,p.id,a.id,r.status.toUpperCase(),accessClean(r.reason,600),now,a.id,r.revision+1,now,p.id)
  ]);if(!results[0].meta?.changes)return accessJSON({error:'Concurrent review. Refresh.'},409);return accessJSON({ok:true});
 }
 return accessJSON({error:'Unknown account endpoint.'},404);
 }catch{return accessJSON({error:'Account service could not complete the request. Refresh and retry.'},503)}
}
async function accessGuard(request,env){
 const p=await accessPrincipal(request,env);if(!p)return {response:accessJSON({error:'Sign in with your application account.'},401)};
 if(p.status!=='approved')return {response:accessJSON({error:'Account is '+p.status+'. Administrator approval is required.'},403)};
 if(p.role==='patient')return {response:accessJSON({error:'Patient accounts cannot access staff APIs.'},403)};
 const path=new URL(request.url).pathname;
 if(!p.owner&&/\/api\/escalation\//.test(path))return {response:accessJSON({error:'Escalation gateway configuration is restricted to the Super Admin in this release.'},403)};
 if(!p.owner&&/\/api\/team\/(workspaces|join|invite|profile)$/.test(path))return {response:accessJSON({error:'Super Admin manages registration and workspace access.'},403)};
 if(p.owner){const teams=(await env.DB.prepare('SELECT id FROM demo_teams').all()).results;for(const t of teams)await env.DB.prepare('INSERT OR IGNORE INTO team_members (id,team_id,user_id,label,role,joined_at) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),t.id,p.user,'Application owner','admin',new Date().toISOString()).run()}
 else {const a=p.account;await env.DB.prepare('DELETE FROM team_members WHERE user_id=? AND team_id<>?').bind(p.user,a.workspace_id).run();const selected=new URL(request.url).searchParams.get('workspace');if(selected&&selected!==a.workspace_id)return {response:accessJSON({error:'Workspace not assigned to this account.'},403)};if(a.workspace_id)await env.DB.prepare('INSERT INTO team_members (id,team_id,user_id,label,role,joined_at) VALUES (?,?,?,?,?,?) ON CONFLICT(team_id,user_id) DO UPDATE SET role=excluded.role,label=excluded.label').bind(crypto.randomUUID(),a.workspace_id,p.user,a.label,a.role,new Date().toISOString()).run()}
 const headers=new Headers(request.headers);headers.set('oai-authenticated-user-id',p.user);headers.delete('oai-authenticated-user-email');return {request:new Request(request,{headers}),principal:p};
}
export {accessApi,accessGuard,accessPrincipal};
