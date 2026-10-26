import {mkdirSync,writeFileSync,appendFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
const [command,...args]=process.argv.slice(2);if(!command)throw Error('A build command is required.');
mkdirSync('.local',{recursive:true});const logfile='.local/ci-step.log';writeFileSync(logfile,`COMMAND: ${command} ${args.join(' ')}\n`);
const child=spawn(process.platform==='win32'&&command==='npm'?'npm.cmd':command,args,{shell:process.platform==='win32',env:process.env,stdio:['ignore','pipe','pipe']});
child.stdout.on('data',data=>{process.stdout.write(data);appendFileSync(logfile,data);});child.stderr.on('data',data=>{process.stderr.write(data);appendFileSync(logfile,data);});
child.on('error',error=>{appendFileSync(logfile,error.message+'\n');console.error(error.message);process.exitCode=1;});child.on('close',code=>{process.exitCode=code||0;});
