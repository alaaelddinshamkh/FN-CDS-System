import {queries} from './query-catalog.mjs';
export function postgresDatabase(env,namespace='live'){
 async function execute(statements){
  const entries=statements.map(s=>{const id=queries.indexOf(s.query);if(id<0)throw Error('Query is not in the approved application catalog');return {id,args:s.args}});
  const response=await (env.DATABASE_FETCH||fetch)(env.SUPABASE_URL+'/functions/v1/fn-database',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+env.FN_DATABASE_KEY},body:JSON.stringify({namespace,statements:entries}),redirect:'error',signal:AbortSignal.timeout(25000)});
  if(!response.ok)throw Error('Postgres request failed ('+response.status+')');const result=await response.json();if(!Array.isArray(result.results)||result.results.length!==entries.length)throw Error('Invalid database response');return result.results;
 }
 return {prepare(query){const s={query,args:[],bind(...args){s.args=args;return s},async all(){return (await execute([s]))[0]},async first(){return (await s.all()).results[0]||null},async run(){return s.all()}};return s},batch:execute};
}
export function databaseEnvironment(env){if(env.FN_DATABASE_MODE!=='supabase')return env;if(!env.FN_DATABASE_KEY)throw Error('Postgres connection is not configured');return {...env,DB:postgresDatabase(env)}}
