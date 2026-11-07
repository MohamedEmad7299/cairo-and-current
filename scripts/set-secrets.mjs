// Accept {admin,viewer} as JSON on stdin. Never put codes in command arguments.
// This script sends only salted PBKDF2 hashes to Cloudflare, not the access codes.
import {spawn} from 'node:child_process';
import {passwordHash} from '../worker/index.js';
let raw='';for await(const chunk of process.stdin)raw+=chunk;
const values=JSON.parse(raw);
if(typeof values.admin!=='string'||typeof values.viewer!=='string'||values.admin.length<8||values.viewer.length<8||values.admin===values.viewer)throw new Error('Two different access codes of at least eight characters are required.');
const salt=crypto.randomUUID()+crypto.randomUUID();
const secrets={PASSWORD_SALT:salt,ADMIN_CODE_HASH:await passwordHash(values.admin,salt),VIEWER_CODE_HASH:await passwordHash(values.viewer,salt)};
raw='';values.admin='';values.viewer='';
const child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','secret','bulk'],{stdio:['pipe','inherit','inherit']});
child.stdin.end(JSON.stringify(secrets));
child.on('exit',code=>process.exit(code??1));
