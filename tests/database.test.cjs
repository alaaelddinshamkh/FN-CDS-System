const assert=require('node:assert/strict');
(async()=>{const {postgresDatabase,databaseEnvironment}=await import('../worker/database.mjs'),{queries,liveQueryCount}=await import('../worker/query-catalog.mjs');let sent=0;
const env={SUPABASE_URL:'https://db.test',FN_DATABASE_KEY:'test-server-credential',DATABASE_FETCH:async(url,init)=>{sent++;assert.equal(init.redirect,'manual');assert.equal(init.headers.Authorization,'Bearer test-server-credential');const b=JSON.parse(init.body);assert.equal(b.namespace,'live');assert.ok(b.statements.every(s=>s.id<liveQueryCount));return Response.json({results:b.statements.map(()=>({results:[{n:2}],meta:{changes:1}}))})}};
const db=postgresDatabase(env);assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM access_accounts WHERE status=\'pending\'').first()).n,2);assert.equal(sent,1);
await assert.rejects(()=>db.prepare('DROP TABLE access_accounts').run(),/approved application catalog/);assert.equal(sent,1);
const before={DB:'old'};assert.equal(databaseEnvironment(before),before);assert.throws(()=>databaseEnvironment({FN_DATABASE_MODE:'supabase'}),/not configured/);
await assert.rejects(()=>postgresDatabase({...env,DATABASE_FETCH:async()=>Response.json({error:'Unavailable'},{status:503})}).prepare(queries[0]).all(),/503/);
assert.ok(!queries.slice(0,liveQueryCount).some(q=>/^DELETE FROM \w+$/.test(q)));
console.log('PASS: catalog-only parameterized gateway, fail-closed Postgres routing, no unrestricted cleanup queries or silent D1 fallback');})();
