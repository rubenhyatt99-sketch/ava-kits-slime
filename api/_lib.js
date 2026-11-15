const R = 'https://api.resend.com';
const h = () => ({ Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' });
async function listAll() {
  const out = []; let after = '';
  for (let i = 0; i < 20; i++) {
    const r = await fetch(R + '/contacts?segment_id=' + process.env.SEGMENT_ID + '&limit=100' + (after ? '&after=' + after : ''), { headers: h() });
    if (!r.ok) throw new Error('list ' + r.status);
    const j = await r.json(); const d = j.data || [];
    out.push(...d);
    if (!j.has_more || !d.length) break;
    after = d[d.length - 1].id;
  }
  return out;
}
function kits(contacts) {
  return contacts.reduce((n, c) => { const m = /^x(\d+)/.exec(c.last_name || ''); return n + (m ? +m[1] : 1); }, 0);
}
module.exports = { R, h, listAll, kits };
