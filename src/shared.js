export const AIRBNB_URL = 'https://www.airbnb.com/experiences/6840710';
export const DEFAULT_COPY = {
 khan: 'Wander through Cairo’s storied markets with a local companion. Discover traditional scents, unique finds, and the atmosphere of Khan El Khalili. Explore the full experience and booking details on Airbnb.',
 kayak: 'A different rhythm of Cairo is coming. Join us for a kayaking experience on Egypt’s Nile and discover the city from the water. Full details will be announced soon.'
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
