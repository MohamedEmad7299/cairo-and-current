import QRCode from 'qrcode';
import {AIRBNB_URL, AIRBNB_LOGO_PATH, DEFAULT_COPY, validateRecord, qrUrl, escapeHtml as h, csv} from './shared.js';
import './style.css';
const root=document.querySelector('#app'),modal=document.querySelector('#modal');
const API=import.meta.env.VITE_API_URL || (import.meta.env.DEV?'http://127.0.0.1:8787':'https://cairo-and-current-api.cairo-and-current.workers.dev');
let session=null,copy={...DEFAULT_COPY},page=1,records=[],lastQR=null,routeVersion=0;
try {session=JSON.parse(sessionStorage.getItem('cc-session'));}catch{}
const icon=(type)=>({arrow:'↗',qr:'▦',dashboard:'◫',logout:'↪',wave:'≈',plus:'＋'}[type]||type);
const QR_LOGO_COLOR='#e2bf87';
const airbnbLogoSvg=`<span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="${AIRBNB_LOGO_PATH}"/></svg></span>`;
const brand=`<a class="brand" href="#/tours" aria-label="Airbnb Experiences home">${airbnbLogoSvg}<span>Airbnb Experiences<small>TIMELESS HERITAGE. LIVING CULTURE.</small></span></a>`;
const time=v=>v?new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Cairo'}).format(new Date(v)):'Not scanned yet';
function toast(message){const el=document.querySelector('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),5000);}
async function api(path,options={}) {
 if(!API)throw new Error('The service is not connected yet. Please contact the administrator.');
 let res;
 try {res=await fetch(API+path,{...options,signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json',...(session?{Authorization:`Bearer ${session.token}`} : {}),...options.headers}});}catch{throw new Error('Unable to connect. Check your connection and try again.');}
 const data=await res.json();
 if(!res.ok){if(res.status===401&&path!=='/api/login'){session=null;sessionStorage.removeItem('cc-session');}throw Object.assign(new Error(data.error||'Please try again.'),{status:res.status});}return data;
}
function bind(id,event,handler){document.getElementById(id)?.addEventListener(event,handler);}
function openModal(html){modal.innerHTML=`<button class="close" aria-label="Close dialog">×</button>${html}`;modal.querySelector('.close').onclick=()=>modal.close();modal.showModal();}
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
const contactsHtml=`<div class="footer-dev-line"><span>Designed & Developed by <strong>Mohamed Emad</strong></span><div class="dev-social-bar"><a href="tel:+201020766525" class="dev-link" title="Call: 01020766525" aria-label="Phone"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></a><a href="https://wa.me/201020766525" target="_blank" rel="noopener noreferrer" class="dev-link" title="WhatsApp: 01020766525" aria-label="WhatsApp"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 2C6.5 2 2 6.5 2 12.03c0 1.97.57 3.8 1.55 5.35L2.24 21.76l4.55-1.28c1.5 1 3.28 1.55 5.24 1.55 5.53 0 10.03-4.5 10.03-10.03 0-5.53-4.5-10-10.03-10zm0 18.35c-1.74 0-3.37-.48-4.78-1.33l-.34-.21-2.7.76.73-2.63-.23-.37c-.94-1.46-1.47-3.18-1.47-4.99 0-4.6 3.74-8.35 8.35-8.35 4.6 0 8.35 3.74 8.35 8.35 0 4.61-3.75 8.35-8.35 8.35zm4.83-6.24c-.26-.13-1.57-.77-1.81-.86-.25-.09-.43-.13-.61.13-.18.26-.7 8.86-.86 1.05-.16.18-.32.21-.59.08-.26-.13-1.12-.41-2.13-1.32-.79-.7-1.32-1.57-1.47-1.83-.16-.26-.02-.4.11-.53.12-.12.26-.31.39-.46.13-.16.18-.26.26-.44.09-.18.04-.33-.02-.46-.07-.13-.61-1.48-.84-2.02-.22-.53-.45-.46-.61-.47h-.52c-.18 0-.46.07-.7.33-.24.26-.92.9-.92 2.2 0 1.3 1.03 2.56 1.18 2.74.15.18 2.03 3.1 4.92 4.35.69.3 1.22.48 1.64.61.69.22 1.32.19 1.82.12.55-.08 1.57-.64 1.79-1.26.22-.61.22-1.14.15-1.26-.06-.11-.24-.18-.5-.31z"/></svg></a><a href="mailto:mohamedemad199912@gmail.com" class="dev-link" title="Email: mohamedemad199912@gmail.com" aria-label="Email"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></a><a href="https://github.com/MohamedEmad7299" target="_blank" rel="noopener noreferrer" class="dev-link" title="GitHub: MohamedEmad7299" aria-label="GitHub"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg></a><a href="https://www.linkedin.com/in/mohamed-emad-450719217" target="_blank" rel="noopener noreferrer" class="dev-link" title="LinkedIn: Mohamed Emad" aria-label="LinkedIn"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg></a><a href="https://www.facebook.com/mohamedemad199912" target="_blank" rel="noopener noreferrer" class="dev-link" title="Facebook: Mohamed Emad" aria-label="Facebook"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></a><a href="https://www.instagram.com/ma7amed_3emad/" target="_blank" rel="noopener noreferrer" class="dev-link" title="Instagram: @ma7amed_3emad" aria-label="Instagram"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg></a></div></div>`;
function footer(){
 const isTeam=location.hash.startsWith('#/dashboard')||location.hash.startsWith('#/builder');
 const teamOrExplore=isTeam
  ?`<a href="#/tours">Explore experiences ${icon('arrow')}</a>`
  :`<a href="#/dashboard" id="team-access-link">Team access ${icon('arrow')}</a>`;
 return `<footer class="site-footer"><div class="footer-row"><span>Made for curious souls. Rooted in Egypt.</span><span class="footer-nav"><a href="#/privacy">Privacy & image credits</a>${teamOrExplore}</span></div>${contactsHtml}</footer>`;
}
function shell(active,content){
 const isGuest=Boolean(session?.record_id);
 const roleTitle=session?.role==='admin'?'Administrator':(isGuest?`Guest: ${session?.guestName||'Personal'}`:'Viewer');
 const pillText=session?.role==='admin'?'Admin workspace':(isGuest?'Personal guest access':'Names-only access');
 root.innerHTML=`<div class="workspace"><aside>${brand}<div class="workspace-label">THE STUDIO</div><nav>${session?.role==='admin'?`<a href="#/builder" class="${active==='builder'?'active':''}">${icon('qr')} <span>QR builder</span></a>`:''}<a href="#/dashboard" class="${active==='dashboard'?'active':''}">${icon('dashboard')} <span>${isGuest?'My activity':'Dashboard'}</span></a><a href="#/tours">${icon('wave')} <span>Explore experiences</span></a></nav><div class="aside-bottom"><span class="role-dot"></span> ${h(roleTitle)}<button id="logout">Sign out ${icon('logout')}</button></div></aside><main class="studio"><div class="studio-top"><span>CAIRO & CURRENT / ${active==='builder'?'GUEST INVITATIONS':(isGuest?'MY INVITATION':'GUEST DIRECTORY')}</span><span class="pill">${pillText}</span></div>${content}${footer()}</main></div>`;
 bind('logout','click',async()=>{try{await api('/api/logout',{method:'POST'});}catch(e){toast(e.message);return;}session=null;sessionStorage.removeItem('cc-session');render();});
}
async function login(target){
 root.innerHTML=`<div class="login-page"><div class="login-art">${brand}<div><span class="eyebrow">BEHIND THE EXPERIENCE</span><h1>A warm welcome<br>starts <em>here.</em></h1><p>A little local knowledge.<br>A world of possibility.</p></div><small>KHAN EL KHALILI · CAIRO, EGYPT</small></div><main class="login-panel"><a class="back" href="#/tours">← Back to experiences</a><div><span class="eyebrow">WORKSPACE & GUEST ACCESS</span><h2>Welcome to the studio.</h2><p class="muted">Enter your access code or personal guest pass.</p><form id="login-form"><label for="code">Access code or guest pass</label><div class="password-wrap"><input id="code" name="code" type="password" autocomplete="current-password" required maxlength="200" placeholder="e.g. admin code or guest_..."><button type="button" id="reveal" aria-label="Show access code">Show</button></div><p id="login-error" class="error" role="alert"></p><button class="primary" type="submit">Enter workspace <span>→</span></button></form><p class="fine">Guests enter their private pass to view their visits securely.</p></div>${footer()}</main></div>`;
 bind('reveal','click',()=>{const input=document.querySelector('#code');input.type=input.type==='password'?'text':'password';document.querySelector('#reveal').textContent=input.type==='password'?'Show':'Hide';});
 bind('login-form','submit',async e=>{e.preventDefault();const button=e.target.querySelector('[type=submit]');button.disabled=true;document.querySelector('#login-error').textContent='';try{session=await api('/api/login',{method:'POST',body:JSON.stringify({code:e.target.code.value})});sessionStorage.setItem('cc-session',JSON.stringify(session));if(target==='builder'&&session.role!=='admin')location.hash='/dashboard';else render();}catch(err){document.querySelector('#login-error').textContent=err.message;}finally{button.disabled=false;}});
 setTimeout(()=>{const input=document.querySelector('#code');if(input)input.focus();},50);
}
function tours(token){
 let selected=null,preview='khan';
 root.innerHTML=`<div class="tour-page"><div class="scene scene-khan visible"></div><div class="scene scene-kayak"></div><div class="scene-shade"></div><header>${brand}<span class="location">30.0444° N &nbsp; 31.2357° E <span>CAIRO, EGYPT</span></span></header><main class="tour-main"><div class="hero-copy"><div class="eyebrow"><span class="gold-line"></span> THE CITY, THROUGH LOCAL EYES</div><h1>Find your<br><em>Egyptian story.</em></h1><p>From eternal stones to living waters.<br>Choose a moment that stays with you.</p></div><section class="experiences" aria-label="Choose an experience"><div class="section-kicker"><span>YOUR NEXT STORY</span><span>01 — 02</span></div><div class="tour-cards"><button id="khan-card" class="tour-card" aria-pressed="false" aria-describedby="khan-description"><div class="card-top"><span class="card-number">01 / CULTURE & DISCOVERY</span><span class="availability">AVAILABLE</span></div><div class="card-title"><h2>Khan El Khalili</h2><span class="card-arrow">↗</span></div><div class="card-sub">The old city. A local companion. Your story.</div><p id="khan-description" class="tour-description">${h(copy.khan)}</p><div class="card-bottom"><span>EXPLORE WITH A LOCAL</span><span class="selection-dot"></span></div></button><button id="kayak-card" class="tour-card" aria-pressed="false" aria-describedby="kayak-description"><div class="card-top"><span class="card-number">02 / WATER & WONDER</span><span class="availability soon">SOON</span></div><div class="card-title"><h2>Kayak the Nile</h2><span class="card-arrow">≈</span></div><div class="card-sub">A slower rhythm. A different perspective.</div><p id="kayak-description" class="tour-description">${h(copy.kayak)}</p><div class="card-bottom"><span>AN EXPERIENCE IN THE MAKING</span><span class="selection-dot"></span></div></button></div><div class="proceed-row"><p id="selection-note" aria-live="polite">Choose an experience to begin.</p><button id="proceed" class="primary gold" disabled>Proceed <span>↗</span></button></div><p id="scan-status" class="scan-status" role="status"></p></section></main>${footer()}</div>`;
 const update=()=>{for(const key of ['khan','kayak']){document.querySelector(`.scene-${key}`).classList.toggle('visible',preview===key);document.getElementById(`${key}-card`).classList.toggle('selected',selected===key);document.getElementById(`${key}-card`).setAttribute('aria-pressed',String(selected===key));}document.querySelector('#proceed').disabled=selected!=='khan';document.querySelector('#selection-note').textContent=selected==='khan'?'Khan El Khalili selected · Continue to Airbnb':selected==='kayak'?'Coming soon. Your next river story is on its way.':'Choose an experience to begin.';};
 for(const key of ['khan','kayak']){const card=document.getElementById(`${key}-card`);card.onmouseenter=card.onfocus=()=>{preview=key;update();};card.onmouseleave=card.onblur=()=>{preview=selected||'khan';update();};card.onclick=()=>{selected=key;preview=key;update();};}
 bind('proceed','click',()=>{if(selected==='khan')location.assign(AIRBNB_URL);});
 if(token){const status=document.querySelector('#scan-status');const eventId=crypto.randomUUID();api('/api/scan',{method:'POST',body:JSON.stringify({token,eventId})}).catch(err=>{if(!status.isConnected)return;status.textContent=err.status===404?'This invitation is no longer active. You can still explore our experiences.':'Your visit could not be recorded. You can still explore our experiences.';});}
 api('/api/copy').then(data=>{copy=data;for(const key of ['khan','kayak']){const el=document.getElementById(`${key}-description`);if(el)el.textContent=copy[key];}}).catch(()=>{});
}
function drawLogoOnCanvas(canvas){
 const ctx=canvas.getContext('2d');
 const logoSize=canvas.width*0.18;
 const cx=(canvas.width-logoSize)/2;
 const cy=(canvas.height-logoSize)/2;
 const scale=logoSize/24;
 const path=new Path2D(AIRBNB_LOGO_PATH);

 ctx.save();
 ctx.translate(cx,cy);
 ctx.scale(scale,scale);

 // White contour halo matching the exact Airbnb silhouette (no background box or circle)
 ctx.strokeStyle='#ffffff';
 ctx.lineWidth=3.4;
 ctx.lineJoin='round';
 ctx.lineCap='round';
 ctx.stroke(path);

 // Fill loop opening with white so inner QR dots don't clash
 ctx.fillStyle='#ffffff';
 ctx.fill(path);

 // Draw logo on top in exact sand/gold color
 ctx.fillStyle=QR_LOGO_COLOR;
 ctx.fill(path);
 ctx.restore();
}
async function generateQRSvg(url){
 let svg=await QRCode.toString(url,{type:'svg',margin:4,errorCorrectionLevel:'M',color:{dark:'#152e2b',light:'#ffffff'}});
 const match=svg.match(/viewBox="0 0 (\d+) (\d+)"/);
 if(match){
  const size=Number(match[1]);
  const logoModules=size*0.18;
  const scale=Number((logoModules/24).toFixed(4));
  const cx=Number(((size-logoModules)/2).toFixed(3));
  const cy=Number(((size-logoModules)/2).toFixed(3));
  const logoGroup=`<g transform="translate(${cx}, ${cy}) scale(${scale})"><path d="${AIRBNB_LOGO_PATH}" fill="#ffffff" stroke="#ffffff" stroke-width="3.4" stroke-linejoin="round" stroke-linecap="round"/><path d="${AIRBNB_LOGO_PATH}" fill="${QR_LOGO_COLOR}"/></g>`;
  svg=svg.replace('</svg>',`${logoGroup}</svg>`);
 }
 return svg;
}
async function showQR(record,target='qr-preview') {
 lastQR=record;const targetEl=document.getElementById(target);if(!targetEl)return;
 const url=qrUrl(location.href.split('#')[0],record.token);
 const canvas=document.createElement('canvas');await QRCode.toCanvas(canvas,url,{width:480,margin:4,errorCorrectionLevel:'M',color:{dark:'#152e2b',light:'#ffffff'}});
 drawLogoOnCanvas(canvas);
 targetEl.innerHTML=`<span class="eyebrow">YOUR INVITATION IS READY</span><div class="qr-art"></div><h3>${h(record.name)}</h3><p>Scan. Discover. Make a memory.</p><div class="qr-actions"><button id="download-png">PNG ↓</button><button id="download-svg">SVG ↓</button><button id="print-qr">Print ↗</button></div><button class="text-button" id="copy-link">Copy invitation link</button>${record.view_code?`<div class="guest-pass-card"><span class="pass-label">GUEST DASHBOARD ACCESS PASS</span><div class="pass-row"><code class="pass-code">${h(record.view_code)}</code><button type="button" class="copy-pass-btn" id="copy-guest-pass">Copy pass 📋</button></div><p class="pass-note">Share this pass with <strong>${h(record.name)}</strong> to view their visits securely. No other guest data is shown.</p></div>`:''}<p class="fine">Reusable · No automatic expiry</p>`;targetEl.querySelector('.qr-art').append(canvas);
 bind('download-png','click',()=>canvas.toBlob(blob=>download(blob,'cairo-current-invitation.png')));
 bind('download-svg','click',async()=>download(new Blob([await generateQRSvg(url)],{type:'image/svg+xml'}),'cairo-current-invitation.svg'));
 bind('copy-link','click',async()=>{try{await navigator.clipboard.writeText(url);toast('Invitation link copied.');}catch{toast('Clipboard unavailable. Download the QR instead.');}});
 if(record.view_code)bind('copy-guest-pass','click',async()=>{try{await navigator.clipboard.writeText(record.view_code);toast('Guest viewing pass copied.');}catch{toast('Clipboard unavailable.');}});
 bind('print-qr','click',()=>{document.querySelector('#print-sheet')?.remove();const sheet=document.createElement('div');sheet.id='print-sheet';sheet.innerHTML=`<h1>Cairo & Current</h1><p>Your invitation to discover Cairo</p><img src="${canvas.toDataURL()}" alt="Scan to explore Cairo"><h2>${h(record.name)}</h2><p>Scan with your phone camera to explore the experiences.</p>${record.view_code?`<div class="print-pass"><p><strong>Dashboard Viewing Pass:</strong> <code>${h(record.view_code)}</code></p><p class="print-sub">Sign in at the dashboard to view your visits privately.</p></div>`:''}`;document.body.append(sheet);window.print();});
}
function builder(){
 shell('builder',`<div class="page-heading"><div><span class="eyebrow">MAKE THE FIRST CONNECTION</span><h1>A little code.<br><em>A whole city.</em></h1><p class="muted">Create a personal invitation to discover Cairo.</p></div><span class="step-label">01 / CREATE AN INVITATION</span></div><div class="builder-grid"><section class="panel"><div class="panel-heading"><span class="mini-icon">▦</span><div><h2>Guest details</h2><p>Two details. One memorable beginning.</p></div></div><form id="builder-form"><label for="name">Guest name <span class="required">*</span></label><input id="name" name="name" autocomplete="name" maxlength="100" required placeholder="e.g. Alex Morgan"><label for="mobile">Mobile number <span class="optional">OPTIONAL</span></label><input id="mobile" name="mobile" type="tel" autocomplete="tel" maxlength="30" placeholder="e.g. +20 100 000 0000"><p class="fine">Include the country code for international numbers.</p><p class="error" id="builder-error" role="alert"></p><button type="submit" class="primary">Generate QR code <span>↗</span></button></form><div class="privacy-note"><span>◇</span><p>Guest details stay in your private workspace.<br>The QR contains a secure invitation link.</p></div></section><section id="qr-preview" class="qr-preview"><div class="qr-placeholder">▦</div><span class="eyebrow">A SMALL INVITATION. A BIG DISCOVERY.</span><h2>Your QR code<br>will appear here.</h2><p>Ready to download, print, and share<br>as soon as you add your guest.</p></section></div><div class="how-strip"><span><b>01</b> Add your guest</span><span><b>02</b> Share their QR</span><span><b>03</b> Follow their visits</span></div>`);
 if(lastQR)showQR(lastQR);
 bind('builder-form','submit',async e=>{e.preventDefault();const btn=e.target.querySelector('[type=submit]');btn.disabled=true;const error=document.querySelector('#builder-error');error.textContent='';try{const data=validateRecord(Object.fromEntries(new FormData(e.target)));const record=await api('/api/records',{method:'POST',body:JSON.stringify(data)});await showQR(record);toast('Invitation created and saved.');e.target.reset();}catch(err){error.textContent=err.message;}finally{btn.disabled=false;}});
}
function dashboard(){
 const admin=session.role==='admin';
 const isGuest=Boolean(session?.record_id);
 page=1;
 const headingEyebrow=isGuest?'YOUR INVITATION':(admin?'EVERY INVITATION HAS A STORY':'THE GUEST DIRECTORY');
 const headingH1=isGuest?`Welcome, <em>${h(session.guestName||'Guest')}</em>`:(admin?'Your city. <em>Your connections.</em>':'A warm welcome, <em>by name.</em>');
 const headingSub=isGuest?'Private activity and visit history for your invitation.':(admin?'A clear view of your guests and their QR visits.':'A clear view of guest invitations and QR visit activity.');
 shell('dashboard',`<div class="page-heading"><div><span class="eyebrow">${headingEyebrow}</span><h1>${headingH1}</h1><p class="muted">${headingSub}</p></div>${admin?'<a class="primary" href="#/builder">＋ New invitation</a>':''}</div><div id="stats" class="stats-grid" aria-live="polite"><p>Loading activity…</p></div><section class="panel activity-panel"><div><span class="eyebrow">THE LAST 14 DAYS</span><h2>Visits, at a glance.</h2><p class="fine">${isGuest?'Your QR-link visits · Cairo time':'QR-link openings · days shown in Cairo time'}</p></div><div id="chart" class="chart" aria-label="Daily visit counts"></div></section><section class="panel directory"><div class="directory-head"><div><span class="eyebrow">${isGuest?'PERSONAL DETAILS':'YOUR CONNECTIONS'}</span><h2>${isGuest?'Your invitation activity':'Guest directory'}</h2></div>${admin?'<div class="button-group"><button id="change-passwords">Change access codes 🔒</button><button id="edit-copy">Edit tour descriptions</button><button id="export">Export CSV ↓</button></div>':''}</div><form id="filters" class="filters"${isGuest?' style="display:none"':''}><input aria-label="Search guests" name="q" placeholder="${admin?'Search name or mobile…':'Search names…'}"><label>From<input type="date" name="from"></label><label>To<input type="date" name="to"></label><button type="submit">Search</button><button type="reset">Reset</button></form><div id="records" aria-live="polite">Loading…</div><div class="pagination"${isGuest?' style="display:none"':''}><span id="page-label">Page 1</span><div><button id="prev" disabled>← Previous</button><button id="next" disabled>Next →</button></div></div></section><p class="fine">${isGuest?'Private guest workspace. You are viewing your personal invitation activity only.':(admin?'Scan times display in Cairo time. Visits count link openings, not verified people or bookings.':'Viewer workspace. Phone numbers and export controls are restricted to administrators.')}</p>`);
 bind('filters','submit',e=>{e.preventDefault();page=1;loadRecords();});bind('filters','reset',()=>{setTimeout(()=>{page=1;loadRecords();},0);});bind('prev','click',()=>{page--;loadRecords();});bind('next','click',()=>{page++;loadRecords();});
 loadStats();if(admin){bind('change-passwords','click',changePasswords);bind('export','click',exportRecords);bind('edit-copy','click',editCopy);}loadRecords();
}
async function loadStats(){
 try{
  const data=await api('/api/stats');
  if(!document.querySelector('#stats'))return;
  const isGuest=Boolean(session?.record_id);
  const labels=isGuest
   ?[['Your invitation',data.records],['Your QR visits',data.scans],['Visit status',data.visited?'Visited':'Not yet'],['QR status',data.active?'Active':'Disabled']]
   :[['Invitations created',data.records],['QR-link visits',data.scans],['Invitations visited',data.visited],['Active QR codes',data.active]];
  const subtitles=isGuest
   ?['PERSONAL LINK','TOTAL OPENINGS','ACTIVITY RECORDED','NO AUTOMATIC EXPIRY']
   :['READY TO SHARE','EVERY OPENING','DISTINCT INVITATIONS','NO AUTOMATIC EXPIRY'];
  document.querySelector('#stats').innerHTML=labels.map(([label,value],i)=>`<div class="stat"><span>${label}</span><strong>${value}</strong><small>${subtitles[i]}</small></div>`).join('');
  const cairoDayFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo'});
  const now=Date.now();
  const days=[];
  for(let i=13;i>=0;i--){
   const day=cairoDayFormatter.format(new Date(now-i*86400000));
   if(!days.some(x=>x.day===day))days.push({day,count:data.days.find(d=>d.day===day)?.count||0});
  }
  while(days.length<14){
   const first=new Date(days[0].day+'T12:00:00Z');first.setDate(first.getDate()-1);
   days.unshift({day:cairoDayFormatter.format(first),count:0});
  }
  if(days.length>14)days.splice(0,days.length-14);
  const max=Math.max(1,...days.map(d=>d.count));
  document.querySelector('#chart').innerHTML=days.map(d=>`<div class="chart-column" title="${d.day}: ${d.count} visits"><span>${d.count}</span><div class="bar" style="height:${Math.max(3,d.count/max*90)}px"></div><small>${d.day.slice(8)}</small></div>`).join('');
 }catch(e){const el=document.querySelector('#stats');if(el)el.innerHTML=`<p class="error">${h(e.message)}</p>`;}
}
let listRequest=0;
async function loadRecords(){
 const request=++listRequest;
 const el=document.querySelector('#records');
 if(!el)return;
 el.textContent='Loading…';
 try{
  const params=new URLSearchParams(new FormData(document.querySelector('#filters')));
  params.set('page',page);
  const data=await api('/api/records?'+params);
  if(request!==listRequest||!el.isConnected)return;
  records=data.items;
  const admin=session?.role==='admin';
  const isGuest=Boolean(session?.record_id);
  if(isGuest){
   el.innerHTML=records.length?`<div class="table-wrap"><table><thead><tr><th>Scan</th><th>Date · Cairo</th><th>Time · Cairo</th><th>Day</th><th>Status</th></tr></thead><tbody>${records.map((r,i)=>{
    if(!r.scanned_at)return `<tr><td><span class="avatar">—</span><strong>No scans yet</strong><span class="sr-only">${h(r.name)}</span></td><td colspan="3"><span class="muted">No visits recorded yet. Scan your personal QR code to add visits.</span></td><td><span class="status ${r.active?'':'inactive'}">${r.active?'Active':'Disabled'}</span></td></tr>`;
    const d=new Date(r.scanned_at);
    const dateStr=new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Cairo',day:'numeric',month:'short',year:'numeric'}).format(d);
    const timeStr=new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Cairo',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(d);
    const dayStr=new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Cairo',weekday:'long'}).format(d);
    const scanNum=r.scan_count?(r.scan_count-((page-1)*50+i)):((page-1)*50+i+1);
    return `<tr><td><span class="avatar">${scanNum}</span><strong>Scan ${scanNum}</strong><span class="sr-only">${h(r.name)}</span></td><td>${h(dateStr)}</td><td>${h(timeStr)}</td><td>${h(dayStr)}</td><td><span class="status">Recorded</span></td></tr>`;
   }).join('')}</tbody></table></div>`:'<div class="empty"><span>◌</span><h3>No visits found.</h3></div>';
  }else{
   el.innerHTML=records.length?`<div class="table-wrap"><table><thead><tr><th>Guest name</th>${admin?'<th>Mobile</th><th>Viewing pass</th>':''}<th>QR visits</th><th>Last scan · Cairo</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>${records.map((r,i)=>`<tr><td><span class="avatar">${h(r.name.slice(0,1).toUpperCase())}</span><strong>${h(r.name)}</strong></td>${admin?`<td>${h(r.mobile)||'<span class="muted">Not provided</span>'}</td><td><code class="pass-code">${h(r.view_code||'—')}</code></td>`:''}<td>${r.scan_count??0}</td><td>${h(time(r.last_scan))}</td><td><span class="status ${r.active?'':'inactive'}">${r.active?'Active':'Disabled'}</span></td><td>${admin?`<button data-record="${i}" aria-label="Manage ${h(r.name)}">Manage ↗</button>`:''}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty"><span>◌</span><h3>No guests found.</h3><p>Create an invitation or try another search.</p></div>';
   el.querySelectorAll('[data-record]').forEach(btn=>btn.onclick=()=>manage(records[Number(btn.dataset.record)]));
  }
  document.querySelector('#page-label').textContent=`Page ${page}`;
  document.querySelector('#prev').disabled=page<=1;
  document.querySelector('#next').disabled=!data.hasMore;
 }catch(e){if(el.isConnected)el.innerHTML=`<p class="error">${h(e.message)}</p><button id="retry-records">Try again</button>`;bind('retry-records','click',loadRecords);}
}
async function showGuestHistory(record){
 openModal(`<span class="eyebrow">YOUR INVITATION</span><h2>${h(record.name)}</h2><h3>Visit history</h3><p class="fine">Cairo time · latest first</p><div id="scan-history">Loading…</div><button id="more-scans" hidden>Load more</button>`);
 let scanPage=1;
 const load=async()=>{
  try{
   const result=await api(`/api/records/${record.id}/scans?page=${scanPage}`);
   const el=document.querySelector('#scan-history');
   if(!el)return;
   if(scanPage===1)el.innerHTML='';
   el.insertAdjacentHTML('beforeend',result.items.map(s=>`<p class="scan-entry"><span class="role-dot"></span> ${h(time(s.scanned_at))}</p>`).join('')||'<p class="muted">No visits recorded yet.</p>');
   document.querySelector('#more-scans').hidden=!result.hasMore;
  }catch(e){const el=document.querySelector('#scan-history');if(el)el.textContent=e.message;}
 };
 bind('more-scans','click',()=>{scanPage++;load();});
 load();
}
async function manage(record){
 openModal(`<span class="eyebrow">GUEST DETAILS</span><h2>${h(record.name)}</h2>${record.view_code?`<div class="guest-pass-card"><span class="pass-label">GUEST VIEWING PASS</span><div class="pass-row"><code class="pass-code">${h(record.view_code)}</code><button type="button" class="copy-pass-btn" id="modal-copy-pass">Copy pass 📋</button></div><p class="pass-note">Private code for <strong>${h(record.name)}</strong> to view their personal visits.</p></div>`:''}<form id="edit-record"><label for="edit-name">Name</label><input id="edit-name" name="name" required maxlength="100" value="${h(record.name)}"><label for="edit-mobile">Mobile</label><input id="edit-mobile" name="mobile" maxlength="30" type="tel" value="${h(record.mobile)}"><label class="check-label"><input name="active" type="checkbox" ${record.active?'checked':''}> QR code is active</label><p class="error" id="edit-error" role="alert"></p><button class="primary">Save changes</button></form><div class="button-group modal-actions"><button id="show-record-qr">Download / print QR</button><button id="delete-record" class="danger">Delete record</button></div><h3>Scan history</h3><p class="fine">Cairo time · latest first</p><div id="scan-history">Loading…</div><button id="more-scans" hidden>Load more</button>`);
 if(record.view_code)bind('modal-copy-pass','click',async()=>{try{await navigator.clipboard.writeText(record.view_code);toast('Guest viewing pass copied.');}catch{toast('Clipboard unavailable.');}});
 bind('edit-record','submit',async e=>{e.preventDefault();try{const data=validateRecord(Object.fromEntries(new FormData(e.target)));await api('/api/records/'+record.id,{method:'PUT',body:JSON.stringify({...data,active:e.target.active.checked})});modal.close();toast('Guest updated.');loadRecords();loadStats();}catch(err){document.querySelector('#edit-error').textContent=err.message;}});
 bind('show-record-qr','click',()=>{openModal('<div id="modal-qr" class="qr-preview"></div>');showQR(record,'modal-qr');});
 bind('delete-record','click',()=>{openModal(`<span class="eyebrow">DELETE INVITATION</span><h2>Delete ${h(record.name)}?</h2><p>This permanently deletes the guest and their scan history. Their printed QR will stop recording visits.</p><button id="confirm-delete" class="primary danger">Delete permanently</button>`);bind('confirm-delete','click',async e=>{e.target.disabled=true;try{await api('/api/records/'+record.id,{method:'DELETE'});modal.close();toast('Guest deleted.');loadRecords();loadStats();}catch(err){toast(err.message);e.target.disabled=false;}});});
 let scanPage=1;const load=async()=>{try{const result=await api(`/api/records/${record.id}/scans?page=${scanPage}`);const el=document.querySelector('#scan-history');if(!el)return;if(scanPage===1)el.innerHTML='';el.insertAdjacentHTML('beforeend',result.items.map(s=>`<p class="scan-entry"><span class="role-dot"></span> ${h(time(s.scanned_at))}</p>`).join('')||'<p class="muted">No scans yet.</p>');document.querySelector('#more-scans').hidden=!result.hasMore;}catch(e){const el=document.querySelector('#scan-history');if(el)el.textContent=e.message;}};bind('more-scans','click',()=>{scanPage++;load();});load();
}
async function exportRecords(){const btn=document.querySelector('#export');btn.disabled=true;try{let after='',rows=[];do{const data=await api('/api/export?after='+encodeURIComponent(after));rows.push(...data.items);after=data.next;}while(after);const text=csv([['Name','Mobile','Viewing pass','Created UTC','QR active','Scan count','Last scan UTC'],...rows.map(r=>[r.name,r.mobile,r.view_code||'',r.created_at,r.active?'Yes':'No',r.scan_count,r.last_scan])]);download(new Blob(['\ufeff'+text],{type:'text/csv;charset=utf-8'}),'cairo-current-guests.csv');toast('Guest records exported. Keep this file private.');}catch(e){toast(e.message);}finally{btn.disabled=false;}}
async function changePasswords(){
 openModal(`<span class="eyebrow">WORKSPACE SECURITY</span><h2>Change access codes</h2><p class="fine">Update the access code for administrators or viewers. You must enter your current administrator code to authorize changes.</p><form id="password-form"><label for="pwd-target">Target role</label><select id="pwd-target" name="target"><option value="admin">Administrator code (Full access)</option><option value="viewer">Viewer code (Names & statistics only)</option></select><label for="pwd-current">Current administrator code <span class="required">*</span></label><div class="password-wrap"><input id="pwd-current" name="currentCode" type="password" required maxlength="200" autocomplete="current-password" placeholder="Enter current admin code"><button type="button" class="reveal-btn" data-target="pwd-current" aria-label="Show current code">Show</button></div><label for="pwd-new">New access code <span class="required">*</span></label><div class="password-wrap"><input id="pwd-new" name="newCode" type="password" required minlength="8" maxlength="200" autocomplete="new-password" placeholder="At least 8 characters"><button type="button" class="reveal-btn" data-target="pwd-new" aria-label="Show new code">Show</button></div><label for="pwd-confirm">Confirm new access code <span class="required">*</span></label><div class="password-wrap"><input id="pwd-confirm" name="confirmCode" type="password" required minlength="8" maxlength="200" autocomplete="new-password" placeholder="Re-enter new access code"><button type="button" class="reveal-btn" data-target="pwd-confirm" aria-label="Show confirm code">Show</button></div><p class="error" id="password-error" role="alert"></p><button class="primary" type="submit">Update access code <span>→</span></button></form>`);
 modal.querySelectorAll('.reveal-btn').forEach(btn=>{btn.onclick=()=>{const inp=document.getElementById(btn.dataset.target);if(!inp)return;inp.type=inp.type==='password'?'text':'password';btn.textContent=inp.type==='password'?'Show':'Hide';};});
 bind('password-form','submit',async e=>{
  e.preventDefault();
  const form=e.target;const btn=form.querySelector('[type=submit]');const err=document.getElementById('password-error');err.textContent='';
  const target=form.target.value;const currentCode=form.currentCode.value.trim();const newCode=form.newCode.value.trim();const confirmCode=form.confirmCode.value.trim();
  if(newCode!==confirmCode){err.textContent='New access codes do not match.';return;}
  if(newCode.length<8){err.textContent='New access code must be at least 8 characters long.';return;}
  if(newCode===currentCode){err.textContent='New code must be different from current administrator code.';return;}
  btn.disabled=true;
  try{
   const res=await api('/api/password',{method:'POST',body:JSON.stringify({target,currentCode,newCode})});
   modal.close();
   toast(res.message||'Access code updated successfully.');
  }catch(error){
   err.textContent=error.message;
  }finally{
   btn.disabled=false;
  }
 });
}
async function editCopy(){try{copy=await api('/api/copy');openModal(`<span class="eyebrow">THE EXPERIENCE IN WORDS</span><h2>Tour descriptions</h2><form id="copy-form"><label for="copy-khan">Khan El Khalili</label><textarea id="copy-khan" name="khan" minlength="10" maxlength="800" required>${h(copy.khan)}</textarea><label for="copy-kayak">Kayak the Nile · Soon</label><textarea id="copy-kayak" name="kayak" minlength="10" maxlength="800" required>${h(copy.kayak)}</textarea><p class="fine">Kayak remains unavailable for booking.</p><button class="primary">Save descriptions</button></form>`);bind('copy-form','submit',async e=>{e.preventDefault();try{await api('/api/copy',{method:'PUT',body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});modal.close();toast('Descriptions updated.');}catch(err){toast(err.message);}});}catch(e){toast(e.message);}}
function privacy(){root.innerHTML=`<div class="info-page"><header>${brand}<a href="#/tours">← Experiences</a></header><main class="panel"><span class="eyebrow">A LITTLE TRANSPARENCY</span><h1>Privacy & credits.</h1><h2>Your invitation</h2><p>Our team records the name and optional mobile number provided when an invitation is created. Opening its QR link records the visit time against that invitation. A QR link can be shared, so visits do not verify anyone’s identity.</p><p>Administrators can manage these records. Viewers can see names only. Records have no scheduled deletion; ask the team member who gave you the invitation to correct or remove your record.</p><p>We do not add device, location, or advertising analytics. Hosting providers may process technical request information to operate and secure their services. Team sign-in uses session storage and an expiring access token.</p><h2>Booking</h2><p>Proceed takes you to Airbnb, which operates independently under its own terms and privacy policy. We do not receive booking confirmations.</p><h2>Photography</h2><p><a href="https://commons.wikimedia.org/wiki/File:Khan_el-Khalili_2019.jpg" rel="noreferrer">Khan el-Khalili 2019</a> — Mohammed Moussa, <a href="https://creativecommons.org/licenses/by-sa/4.0/" rel="noreferrer">CC BY-SA 4.0</a>. Displayed with responsive cropping and a dark overlay; image adaptations remain under that license.</p><p><a href="https://commons.wikimedia.org/wiki/File:Cairo_Nile_(2).jpg" rel="noreferrer">Cairo Nile (2)</a> — Radosław Botev / Fundacja Nomos, <a href="https://creativecommons.org/licenses/by/3.0/pl/" rel="noreferrer">CC BY 3.0 PL</a>. Displayed with responsive cropping and a dark overlay. River scenery illustrates the upcoming experience; it is not a photograph of our kayak tour.</p></main>${footer()}</div>`;}
async function render(){const version=++routeVersion;modal.close();const parts=location.hash.replace(/^#\/?/,'').split('/');const route=parts[0]||'tours';document.title=`${route==='builder'?'QR Builder':route==='dashboard'?'Dashboard':'Discover Cairo'} — Cairo & Current`;if(route==='privacy'){privacy();return;}if(route==='tours'){tours(parts[1]);return;}if(!['builder','dashboard'].includes(route)){location.hash='/tours';return;}if(!session){login(route);return;}root.innerHTML='<main class="loading-screen">Opening your workspace…</main>';try{const data=await api('/api/session');if(version!==routeVersion)return;session.role=data.role;session.record_id=data.record_id;session.guestName=data.guestName;sessionStorage.setItem('cc-session',JSON.stringify(session));if(route==='builder'&&session.role!=='admin'){location.hash='/dashboard';return;}route==='builder'?builder():dashboard();}catch(e){if(version!==routeVersion)return;if(e.status===401)login(route);else{root.innerHTML=`<main class="loading-screen"><p>${h(e.message)}</p><button id="retry-workspace">Try again</button></main>`;bind('retry-workspace','click',render);}}}
document.addEventListener('click',e=>{
 const link=e.target.closest('a[href="#/dashboard"], #team-access-link');
 if(link){
  if(location.hash==='#/dashboard'||location.hash==='#/dashboard/'){
   e.preventDefault();
   const codeInput=document.querySelector('#code');
   if(codeInput){
    codeInput.focus();
    codeInput.scrollIntoView({behavior:'smooth',block:'center'});
   }else{
    render();
   }
  }
 }
});
window.addEventListener('hashchange',render);render();
