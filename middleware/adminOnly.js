module.exports = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Accès refusé. Droits administrateur requis.' });
  }
  next();
};
