import postgres from 'npm:postgres@3.4.7';
import queryCatalog from './catalog.json' with {type:'json'};
const catalog=queryCatalog.queries;
const sql=postgres(Deno.env.get('SUPABASE_DB_URL')!,{prepare:false,max:2,idle_timeout:15,connect_timeout:10,types:{bigint:{to:20,from:[20],serialize:String,parse:Number}}});
const reply=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
Deno.serve(async req=>{
 if(req.method!=='POST')return reply({error:'POST required'},405);
 const token=req.headers.get('Authorization')?.replace(/^Bearer /,'');
 if(!token||!/^[A-Za-z0-9_-]{64}$/.test(token))return reply({error:'Unauthorized'},401);
 try{
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),x=>x.toString(16).padStart(2,'0')).join('');
 const keys=await sql`select key_hash from fn_private.gateway_credentials where name='sites' and key_hash=${hash}`;
 if(keys.length!==1)return reply({error:'Unauthorized'},401);
 const text=await req.text();if(text.length>256000)return reply({error:'Request too large'},413);
 const body=JSON.parse(text);if(!['live','test'].includes(body.namespace)||!Array.isArray(body.statements)||!body.statements.length||body.statements.length>30)return reply({error:'Invalid request'},400);
 for(const s of body.statements){if(!Number.isInteger(s.id)||s.id<0||s.id>=catalog.length||(body.namespace==='live'&&s.id>=queryCatalog.liveQueryCount)||!Array.isArray(s.args)||s.args.length>50||s.args.some((a:unknown)=>a!==null&&typeof a!=='string'&&typeof a!=='number'))return reply({error:'Invalid statement'},400)}
 const schema=body.namespace==='live'?'fn_app':'fn_app_test';
 // A restricted role and fixed catalog confine application operations to these schemas.
 const results=await sql.begin(async tx=>{
  await tx.unsafe('SET LOCAL ROLE fn_cds_backend');
  await tx.unsafe('SET LOCAL search_path TO '+schema+',pg_catalog');
  await tx.unsafe("SET LOCAL statement_timeout TO '12s'");
  const result=[];for(const s of body.statements){const rows=await tx.unsafe(catalog[s.id],s.args);result.push({results:Array.from(rows),meta:{changes:rows.count}})}return result;
 });return reply({results});
 }catch(e){console.error('Database operation failed',e instanceof Error?e.name:'Error');return reply({error:'Database operation failed'},503)}
});
