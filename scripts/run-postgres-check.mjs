import {spawn} from 'node:child_process';
if(process.stdin.isTTY)process.stdin.setRawMode(true);
process.stdout.write('Ready for test configuration on stdin (not logged).\n');
let input='';process.stdin.on('data',chunk=>{input+=chunk;if(!input.includes('\n'))return;process.stdin.pause();const cfg=JSON.parse(input);const child=spawn(process.execPath,['--test',cfg.file],{stdio:'inherit',env:{...process.env,FN_POSTGRES_TEST:'true',FN_TEST_SUPABASE_URL:cfg.url,FN_TEST_DATABASE_KEY:cfg.key}});child.on('exit',code=>process.exit(code||0));});
