const { listAll, kits } = require('./_lib');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try { res.status(200).json({ kits: kits(await listAll()) }); }
  catch (e) { res.status(200).json({ kits: null }); }
};
