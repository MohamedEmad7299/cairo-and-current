import {validateRecord, csv, DEFAULT_COPY} from '../src/shared.js';
const enc = new TextEncoder();
export async function digest(value) {return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(value))), b => b.toString(16).padStart(2, '0')).join('');}
export async function passwordHash(value, salt) {
 const key = await crypto.subtle.importKey('raw', enc.encode(value), 'PBKDF2', false, ['deriveBits']);
 const bits = await crypto.subtle.deriveBits({name:'PBKDF2', salt:enc.encode(salt), iterations:100000, hash:'SHA-256'}, key, 256);
 return Array.from(new Uint8Array(bits), b => b.toString(16).padStart(2,'0')).join('');
}
function equal(a,b) { if (!a || !b || a.length !== b.length) return false; let diff=0; for(let i=0;i<a.length;i++) diff |= a.charCodeAt(i)^b.charCodeAt(i); return diff===0; }
const json = (data,status=200) => new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const fail = (message,status=400) => {throw Object.assign(new Error(message),{status});};
async function body(req) { const raw = await req.text(); if(raw.length>12000) fail('Request too large.',413); try {return JSON.parse(raw);}catch {fail('Invalid JSON.');} }
async function limit(env,key,max,seconds) {
 const now=Date.now();
 const row=await env.DB.prepare('INSERT INTO rate_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<? THEN 1 ELSE count+1 END, expires_at=CASE WHEN expires_at<? THEN excluded.expires_at ELSE expires_at END RETURNING count').bind(key,now+seconds*1000,now,now).first();
 if(row.count>max) fail('Too many attempts. Please try again later.',429);
}
async function auth(req,env,admin=false) {
 const token=req.headers.get('Authorization')?.replace(/^Bearer /,'');
 if(!token || token.length>200) fail('Please sign in.',401);
 const session=await env.DB.prepare('SELECT role FROM sessions WHERE hash=? AND expires_at>?').bind(await digest(token),Date.now()).first();
 if(!session) fail('Your session expired. Please sign in again.',401);
 if(admin && session.role!=='admin') fail('Administrator access required.',403);
 return session;
}
async function getCodeHashes(env) {
 const rows=await env.DB.prepare("SELECT key,value FROM settings WHERE key IN ('admin_code_hash','viewer_code_hash')").all();
 const map=Object.fromEntries((rows?.results||[]).map(r=>[r.key,r.value]));
 return {
  adminHash: map.admin_code_hash || env.ADMIN_CODE_HASH,
  viewerHash: map.viewer_code_hash || env.VIEWER_CODE_HASH
 };
}
function filters(url) {
 const search=(url.searchParams.get('q')||'').slice(0,100);
 const from=url.searchParams.get('from')||'', to=url.searchParams.get('to')||'';
 if([from,to].some(v=>v && !/^\d{4}-\d{2}-\d{2}$/.test(v))) fail('Invalid date filter.');
 if(from && to && from>to) fail('Start date must be before end date.');
 return {search,from,to};
}
async function route(req,env) {
 const url=new URL(req.url), path=url.pathname, method=req.method;
 if(path==='/api/health') return json({ok:true});
 if(path==='/api/copy' && method==='GET') {
  const rows=await env.DB.prepare('SELECT key,value FROM settings').all();
  return json({...DEFAULT_COPY,...Object.fromEntries(rows.results.map(r=>[r.key,r.value]))});
 }
 if(path==='/api/login' && method==='POST') {
  if(!env.PASSWORD_SALT || !env.ADMIN_CODE_HASH || !env.VIEWER_CODE_HASH) fail('Sign-in has not been configured.',503);
  const {code}=await body(req); if(typeof code!=='string'||!code||code.length>200) fail('Enter your access code.');
  const ip=req.headers.get('CF-Connecting-IP')||'local';
  await limit(env,'login:'+await digest(env.PASSWORD_SALT+ip),10,900);
  const hash=await passwordHash(code,env.PASSWORD_SALT);
  const {adminHash, viewerHash}=await getCodeHashes(env);
  const role=equal(hash,adminHash)?'admin':equal(hash,viewerHash)?'viewer':null;
  if(!role) fail('Access code not recognized.',401);
  const token=crypto.randomUUID()+crypto.randomUUID(); const expiresAt=Date.now()+8*3600*1000;
  await env.DB.batch([
   env.DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(Date.now()),
   env.DB.prepare('DELETE FROM rate_limits WHERE expires_at<?').bind(Date.now()),
   env.DB.prepare('INSERT INTO sessions(hash,role,expires_at) VALUES(?,?,?)').bind(await digest(token),role,expiresAt)
  ]);
  return json({token,role,expiresAt});
 }
 if(path==='/api/session'&&method==='GET') return json(await auth(req,env));
 if(path==='/api/logout'&&method==='POST') {
  await auth(req,env); await env.DB.prepare('DELETE FROM sessions WHERE hash=?').bind(await digest(req.headers.get('Authorization').slice(7))).run(); return json({ok:true});
 }
 if(path==='/api/password'&&method==='POST') {
  await auth(req,env,true);
  const {target,currentCode,newCode}=await body(req);
  if(target!=='admin'&&target!=='viewer') fail('Target must be administrator or viewer.');
  if(typeof currentCode!=='string'||!currentCode) fail('Enter your current administrator access code.');
  if(typeof newCode!=='string'||newCode.length<8||newCode.length>200) fail('New access code must contain 8–200 characters.');
  if(currentCode===newCode) fail('New access code must be different from current code.');
  const ip=req.headers.get('CF-Connecting-IP')||'local';
  await limit(env,'pwd:'+await digest(env.PASSWORD_SALT+ip),5,900);
  const {adminHash}=await getCodeHashes(env);
  const currentHash=await passwordHash(currentCode,env.PASSWORD_SALT);
  if(!equal(currentHash,adminHash)) fail('Current administrator access code is incorrect.',401);
  const newHash=await passwordHash(newCode,env.PASSWORD_SALT);
  const key=target==='admin'?'admin_code_hash':'viewer_code_hash';
  const queries=[
   env.DB.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,newHash)
  ];
  if(target==='viewer'){
   queries.push(env.DB.prepare('DELETE FROM sessions WHERE role="viewer"'));
  }else{
   const currentToken=req.headers.get('Authorization')?.replace(/^Bearer /,'');
   queries.push(env.DB.prepare('DELETE FROM sessions WHERE role="admin" AND hash!=?').bind(await digest(currentToken)));
  }
  await env.DB.batch(queries);
  return json({ok:true,target,message:target==='admin'?'Administrator access code updated.':'Viewer access code updated.'});
 }
 if(path==='/api/scan'&&method==='POST') {
  const {token,eventId}=await body(req);
  if(!/^[a-f0-9]{48}$/.test(token)|| !/^[a-f0-9-]{36}$/.test(eventId)) fail('Invalid QR link.');
  const record=await env.DB.prepare('SELECT id FROM records WHERE token=? AND active=1').bind(token).first();
  if(!record) fail('This QR code is no longer available.',404);
  await limit(env,'scan:'+token,120,60);
  await env.DB.prepare('INSERT INTO scans(id,record_id,scanned_at) VALUES(?,?,?) ON CONFLICT(id) DO NOTHING').bind(eventId,record.id,new Date().toISOString()).run();
  return json({ok:true});
 }
 if(path==='/api/copy'&&method==='PUT') {
  await auth(req,env,true); const data=await body(req);
  for(const key of ['khan','kayak']) if(typeof data[key]!=='string'||data[key].trim().length<10||data[key].length>800) fail('Descriptions must contain 10–800 characters.');
  await env.DB.batch(['khan','kayak'].map(key=>env.DB.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,data[key].trim())));return json({ok:true});
 }
 if(path==='/api/records'&&method==='POST') {
  await auth(req,env,true); const data=validateRecord(await body(req));
  const record={id:crypto.randomUUID(),token:Array.from(crypto.getRandomValues(new Uint8Array(24)),b=>b.toString(16).padStart(2,'0')).join(''),...data,active:1,created_at:new Date().toISOString()};
  await env.DB.prepare('INSERT INTO records(id,token,name,mobile,created_at) VALUES(?,?,?,?,?)').bind(record.id,record.token,record.name,record.mobile,record.created_at).run();return json(record,201);
 }
 if(path==='/api/records'&&method==='GET') {
  const session=await auth(req,env); const {search,from,to}=filters(url);
  const page=Math.max(1,Math.min(100000,Number.parseInt(url.searchParams.get('page'))||1)); const size=20;
  if(session.role==='viewer') {
   const where="instr(lower(r.name),lower(?))>0 AND ((?='' AND ?='') OR EXISTS(SELECT 1 FROM scans s WHERE s.record_id=r.id AND (?='' OR s.scanned_at>=?) AND (?='' OR s.scanned_at<=?)))";
   const params=[search,from,to,from,from+'T00:00:00.000Z',to,to+'T23:59:59.999Z'];
   const rows=await env.DB.prepare(`SELECT r.id, r.name, r.active, r.created_at, (SELECT count(*) FROM scans s WHERE s.record_id=r.id) scan_count, (SELECT max(scanned_at) FROM scans s WHERE s.record_id=r.id) last_scan FROM records r WHERE ${where} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`).bind(...params,size+1,(page-1)*size).all();
   return json({items:rows.results.slice(0,size),hasMore:rows.results.length>size});
  }
  const where="(instr(lower(r.name),lower(?))>0 OR instr(r.mobile,?)>0) AND ((?='' AND ?='') OR EXISTS(SELECT 1 FROM scans s WHERE s.record_id=r.id AND (?='' OR s.scanned_at>=?) AND (?='' OR s.scanned_at<=?)))";
  const params=[search,search,from,to,from,from+'T00:00:00.000Z',to,to+'T23:59:59.999Z'];
  const rows=await env.DB.prepare(`SELECT r.*, (SELECT count(*) FROM scans s WHERE s.record_id=r.id) scan_count, (SELECT max(scanned_at) FROM scans s WHERE s.record_id=r.id) last_scan FROM records r WHERE ${where} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`).bind(...params,size+1,(page-1)*size).all();
  return json({items:rows.results.slice(0,size),hasMore:rows.results.length>size});
 }
 if(path==='/api/stats'&&method==='GET') {
  await auth(req,env);
  const summary=await env.DB.prepare('SELECT (SELECT count(*) FROM records) records,(SELECT count(*) FROM scans) scans,(SELECT count(DISTINCT record_id) FROM scans) visited,(SELECT count(*) FROM records WHERE active=1) active').first();
  const days=await env.DB.prepare("SELECT substr(scanned_at,1,10) day,count(*) count FROM scans WHERE scanned_at>=? GROUP BY day ORDER BY day").bind(new Date(Date.now()-13*86400000).toISOString().slice(0,10)).all();return json({...summary,days:days.results});
 }
 if(path==='/api/export'&&method==='GET') {
  await auth(req,env,true);
  // Paginate exports: never silently truncate a growing database.
  const after=url.searchParams.get('after')||'';
  const rows=await env.DB.prepare('SELECT r.*, (SELECT count(*) FROM scans s WHERE s.record_id=r.id) scan_count,(SELECT max(scanned_at) FROM scans s WHERE s.record_id=r.id) last_scan FROM records r WHERE r.id>? ORDER BY r.id LIMIT 501').bind(after).all();
  const items=rows.results.slice(0,500); return json({items,next:rows.results.length>500?items.at(-1).id:null});
 }
 const match=path.match(/^\/api\/records\/([a-f0-9-]{36})(\/scans)?$/);
 if(match) {
  await auth(req,env,true); const id=match[1];
  const existing=await env.DB.prepare('SELECT * FROM records WHERE id=?').bind(id).first();if(!existing) fail('Record not found.',404);
  if(match[2]&&method==='GET') {
   const page=Math.max(1,Number.parseInt(url.searchParams.get('page'))||1);
   const rows=await env.DB.prepare('SELECT scanned_at FROM scans WHERE record_id=? ORDER BY scanned_at DESC LIMIT 51 OFFSET ?').bind(id,(page-1)*50).all();return json({items:rows.results.slice(0,50),hasMore:rows.results.length>50});
  }
  if(!match[2]&&method==='PUT') {const data=await body(req);const valid=validateRecord(data);if(typeof data.active!=='boolean')fail('Invalid QR status.');await env.DB.prepare('UPDATE records SET name=?,mobile=?,active=? WHERE id=?').bind(valid.name,valid.mobile,data.active?1:0,id).run();return json({ok:true});}
  if(!match[2]&&method==='DELETE') {await env.DB.batch([env.DB.prepare('DELETE FROM scans WHERE record_id=?').bind(id),env.DB.prepare('DELETE FROM records WHERE id=?').bind(id)]);return json({ok:true});}
 }
 fail('Not found.',404);
}
export default {async fetch(req,env) {
 const origin=req.headers.get('Origin');
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Vary':'Origin','Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization'};
 if(origin && origin!==env.ALLOWED_ORIGIN) return new Response('Origin not allowed',{status:403,headers});
 if(origin)headers['Access-Control-Allow-Origin']=origin;
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 let response;
 try {response=await route(req,env);} catch(error) {response=json({error:error.status?error.message:error.message?.startsWith('Enter ')?error.message:'Service unavailable. Please try again.'},error.status|| (error.message?.startsWith('Enter ')?400:503));}
 for(const [key,value] of Object.entries(headers))response.headers.set(key,value);
 return response;
}};
