import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {passwordHash} from '../worker/index.js';
export const TEST_ADMIN='local-admin-demo';
export const TEST_VIEWER='local-viewer-demo';
export async function createApi(options={}) {
 const salt='test-environment-only-never-production';
 const mf=new Miniflare(convertV4MiniflareOptions({modules:[{type:'ESModule',path:fileURLToPath(new URL('../worker/index.js',import.meta.url))},{type:'ESModule',path:fileURLToPath(new URL('../src/shared.js',import.meta.url))}],compatibilityDate:'2026-08-06',d1Databases:['DB'],bindings:{ALLOWED_ORIGIN:'http://127.0.0.1:5173',PUBLIC_SITE_URL:'http://127.0.0.1:5173/',PASSWORD_SALT:salt,ADMIN_CODE_HASH:await passwordHash(TEST_ADMIN,salt),VIEWER_CODE_HASH:await passwordHash(TEST_VIEWER,salt)},...options}));
 const db=await mf.getD1Database('DB');
 const sql=await readFile(new URL('../migrations/0001_initial.sql',import.meta.url),'utf8');
 for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean))await db.prepare(statement).run();
 return {mf,db};
}



