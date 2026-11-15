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
    const FROM = "Le Labo d'Ava <ava@avakitsdeslime.fr>";
    const to = String(process.env.NOTIFY_TO || '').split(',').map(x => x.trim()).filter(Boolean);
    const send = body => fetch(R + '/emails', { method: 'POST', headers: h(), body: JSON.stringify(body) }).catch(() => {});
    // alerte pour Ava
    await send({ from: FROM, to, reply_to: [email],
      subject: 'Nouvelle réservation : kit ' + type + ' x' + qty + ' (' + total + ' / 10)',
      text: prenom + ' (' + email + ') réserve ' + qty + ' kit ' + type + '. Total : ' + total + ' / 10.',
      html: '<p><b>' + esc(prenom) + '</b> (' + esc(email) + ') réserve <b>' + qty + ' kit ' + esc(type) + '</b>.</p><p>Total : <b>' + total + ' / 10</b>.</p>' });
    // confirmation pour le client
    await send({ from: FROM, to: [email], reply_to: ['ava@avakitsdeslime.fr'],
      subject: 'Ta réservation est notée, ' + prenom + ' !',
      text: 'Coucou ' + prenom + ',\n\nC\'est noté : ' + qty + ' kit ' + type + ' à 14,99 €. Tu ne paies rien maintenant.\nOn lance la 1re fournée dès qu\'on a 10 kits réservés. La précommande ferme le 25 novembre.\nParles-en à tes copines et copains !\n\nÀ très vite,\nAva, Le Labo d\'Ava\n\nPour ne plus rien recevoir, réponds « stop ».',
      html: '<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto"><h2 style="color:#C55DFF">Ta réservation est notée, ' + esc(prenom) + ' !</h2><p>C\'est noté : <b>' + qty + ' kit ' + esc(type) + '</b> à <b>14,99 €</b>. Tu ne paies rien maintenant.</p><p>On lance la 1re fournée dès qu\'on a 10 kits réservés. La précommande ferme le 25 novembre.</p><p>Parles-en à tes copines et copains !</p><p>À très vite,<br>Ava, Le Labo d\'Ava</p><p style="color:#888;font-size:12px">Pour ne plus rien recevoir, réponds « stop ».</p></div>' });
    return res.status(200).json({ ok: true, kits: total });
  } catch (e) { return res.status(502).json({ error: 'server' }); }
};
