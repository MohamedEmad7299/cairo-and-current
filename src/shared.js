export const AIRBNB_URL = 'https://www.airbnb.com/experiences/6840710';
export const DEFAULT_COPY = {
 khan: 'Your personal Cairo shopping buddy.\nTell me what you want to find and we explore markets at an unrushed pace. I negotiate true local prices, avoid traps, and treat you to authentic Egyptian Meal.',
 kayak: 'Launch your tour with a safety briefing, get fitted with gear, learn basic paddling with academy pros on calm water, soak up Nile views, then land back at the dock for drinks. Perfect for all levels.'
};
export function validateRecord(value) {
 const name = typeof value.name === 'string' ? value.name.trim().replace(/\s+/g, ' ') : '';
 const mobile = typeof value.mobile === 'string' ? value.mobile.trim() : '';
 if (!name || name.length > 100 || /[\u0000-\u001f\u007f]/.test(name)) throw new Error('Enter a name between 1 and 100 characters.');
 if (mobile && (!/^\+?[0-9 ()-]{6,30}$/.test(mobile) || mobile.replace(/\D/g, '').length < 6 || mobile.replace(/\D/g, '').length > 15)) throw new Error('Enter a valid mobile number (6–15 digits), or leave it empty.');
 return {name, mobile};
}
export function csvCell(value) {
 let text = String(value ?? '');
 if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
 return '"' + text.replaceAll('"', '""') + '"';
}
export function csv(rows) {return rows.map(row => row.map(csvCell).join(',')).join('\r\n');}
export function qrUrl(base, token) {
 const url = new URL(base); url.search = ''; url.hash = `/tours/${token}`; return url.href;
}
export function escapeHtml(value) {return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
