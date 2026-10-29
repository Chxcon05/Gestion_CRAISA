const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'craisa-dev-secret';

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(403).json({ error: 'Token inválido' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'ADMIN') return next();
  return res.status(403).json({ error: 'Solo administrador' });
}

function requireVendor(req, res, next) {
  if (req.user && (req.user.role === 'VENDEDOR' || req.user.role === 'ADMIN')) return next();
  return res.status(403).json({ error: 'Solo vendedor o admin' });
}

module.exports = { authMiddleware, requireAdmin, requireVendor, JWT_SECRET };
