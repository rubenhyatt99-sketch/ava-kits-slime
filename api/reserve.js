const { R, h, listAll, kits } = require('./_lib');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TYPES = ['Fluffy', 'Butter', 'Clear', 'Crunchy', 'Galaxy', 'Jelly'];
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  if (b.website) return res.status(200).json({ ok: true }); // piège anti-robot
  const prenom = String(b.prenom || '').trim().slice(0, 40);
  const email = String(b.email || '').trim().toLowerCase().slice(0, 120);
  const type = TYPES.includes(b.type) ? b.type : 'Fluffy';
  const qty = Math.max(1, Math.min(10, parseInt(b.qty, 10) || 1));
  if (!prenom || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || b.consent !== true) return res.status(400).json({ error: 'invalid' });
  try {
    const c = await fetch(R + '/contacts', { method: 'POST', headers: h(), body: JSON.stringify({ email, first_name: prenom, last_name: 'x' + qty + ' ' + type, unsubscribed: false, segments: [{ id: process.env.SEGMENT_ID }] }) });
    if (!c.ok) {
      // contact déjà existant : mise à jour
      const u = await fetch(R + '/contacts/' + encodeURIComponent(email), { method: 'PATCH', headers: h(), body: JSON.stringify({ first_name: prenom, last_name: 'x' + qty + ' ' + type, unsubscribed: false }) });
      if (!u.ok) return res.status(502).json({ error: 'store' });
      await fetch(R + '/contacts/' + encodeURIComponent(email) + '/segments/' + process.env.SEGMENT_ID, { method: 'POST', headers: h() }).catch(() => {});
    }
    const total = kits(await listAll());
    await fetch(R + '/emails', { method: 'POST', headers: h(), body: JSON.stringify({
      from: "Le Labo d'Ava <onboarding@resend.dev>", to: [process.env.NOTIFY_TO], reply_to: [email],
      subject: 'Nouvelle réservation : kit ' + type + ' x' + qty + ' (' + total + ' / 10)',
      text: prenom + ' (' + email + ') réserve ' + qty + ' kit ' + type + '. Total : ' + total + ' / 10.',
      html: '<p><b>' + esc(prenom) + '</b> (' + esc(email) + ') réserve <b>' + qty + ' kit ' + esc(type) + '</b>.</p><p>Total : <b>' + total + ' / 10</b>.</p>' }) }).catch(() => {});
    return res.status(200).json({ ok: true, kits: total });
  } catch (e) { return res.status(502).json({ error: 'server' }); }
};
