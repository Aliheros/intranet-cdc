const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, email, role, nom, avatar, pole }
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

/**
 * Vérifie que l'utilisateur possède l'un des rôles indiqués.
 * À placer après requireAuth dans la chaîne de middleware.
 *
 * @param {...string} roles — ex: requireRole('Admin', 'Bureau')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Accès réservé aux rôles : ${roles.join(', ')}`,
      });
    }
    next();
  };
}

/** Raccourci pour les routes réservées Admin ou Bureau */
const requireAdminOrBureau = requireRole('Admin', 'Bureau');

module.exports = { requireAuth, requireRole, requireAdminOrBureau };
