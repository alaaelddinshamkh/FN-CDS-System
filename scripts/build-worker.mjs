import fs from 'node:fs';
const assets={};const types={html:'text/html; charset=utf-8',js:'application/javascript',css:'text/css',json:'application/json',svg:'image/svg+xml',png:'image/png',webmanifest:'application/manifest+json'};
for(const name of fs.readdirSync('dist'))if(fs.statSync('dist/'+name).isFile()){const ext=name.split('.').at(-1);assets['/'+name]={type:types[ext]||'application/octet-stream',data:fs.readFileSync('dist/'+name).toString('base64')}}
const output=`import {accessApi,accessGuard} from './worker/access.mjs';
import {teamApi} from './worker/team.mjs';
import {api} from './worker/api.mjs';
import {messagingApi} from './worker/messaging.mjs';
import {callsApi} from './worker/calls.mjs';
const assets=${JSON.stringify(assets)};
export default {async fetch(request,env){const url=new URL(request.url);try{if(url.pathname.startsWith('/api/calls/'))return callsApi(request,env);if(url.pathname.startsWith('/api/messages/'))return messagingApi(request,env);if(url.pathname.startsWith('/api/access/'))return accessApi(request,env);if(url.pathname.startsWith('/api/team/')||url.pathname.startsWith('/api/escalation/')){const auth=await accessGuard(request,env);if(auth.response)return auth.response;return url.pathname.startsWith('/api/team/')?teamApi(auth.request,env):api(auth.request,env)}}catch{return new Response(JSON.stringify({error:'Account verification unavailable. Please retry.'}),{status:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}})}const asset=assets[url.pathname==='/'?'/index.html':url.pathname];if(!asset)return new Response('Not found',{status:404});return new Response(Uint8Array.from(atob(asset.data),c=>c.charCodeAt(0)),{headers:{'Content-Type':asset.type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}})}};`;
const {build}=await import('esbuild');
await build({stdin:{contents:output,resolveDir:process.cwd(),sourcefile:'worker-entry.mjs'},bundle:true,format:'esm',platform:'browser',target:'es2022',outfile:'dist/server/index.js'});
fs.mkdirSync('dist/server',{recursive:true});fs.mkdirSync('dist/.openai',{recursive:true});fs.copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');console.log('Built Worker with embedded existing application assets');
