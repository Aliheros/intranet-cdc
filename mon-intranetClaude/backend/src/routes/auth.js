const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { requireAuth } = require('../middleware/auth');
const { auditLog }    = require('../middleware/auditLogger');
const rateLimit = require('express-rate-limit');
const prisma = require('../lib/prisma');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' },
  skipSuccessfulRequests: true, // ne compte que les échecs
});

function generateTokens(user) {
  const payload = { id: user.id, email: user.email, role: user.role, nom: user.nom, avatar: user.avatar, pole: user.pole };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { permissions: true },
  });

  if (!user) {
    await auditLog(
      { user: null, headers: req.headers, ip: req.ip },
      { action: 'auth.login.failed', payload: { email: email?.slice(0, 100), reason: 'not_found' } }
    );
    return res.status(401).json({ error: 'Identifiants invalides' });
  }

  // Bloquer les comptes désactivés (message générique pour ne pas révéler l'état)
  if (user.isDeleted) {
    await auditLog(
      { user: null, headers: req.headers, ip: req.ip },
      { action: 'auth.login.failed', payload: { email: email?.slice(0, 100), reason: 'account_disabled' } }
    );
    return res.status(401).json({ error: 'Identifiants invalides' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    // Log échec de connexion (mot de passe incorrect)
    await auditLog(
      { user: null, headers: req.headers, ip: req.ip },
      { action: 'auth.login.failed', payload: { email: email?.slice(0, 100), reason: 'wrong_password' } }
    );
    return res.status(401).json({ error: 'Identifiants invalides' });
  }

  const { accessToken, refreshToken } = generateTokens(user);

  // Sauvegarder le refresh token
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  // Cookie httpOnly pour le refresh token
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  // Log connexion réussie
  await auditLog(
    { user: { id: user.id, nom: user.nom }, headers: req.headers, ip: req.ip },
    {
      action: 'auth.login',
      targetType: 'User', targetId: user.id, targetNom: user.nom,
      payload: { userAgent: req.headers['user-agent']?.slice(0, 200) ?? null },
    }
  );

  const { passwordHash, ...userSafe } = user;
  res.json({ accessToken, user: userSafe, mustChangePassword: user.mustChangePassword });
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ error: 'Refresh token manquant' });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    return res.status(401).json({ error: 'Refresh token invalide' });
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (!stored || stored.expiresAt < new Date()) {
    return res.status(401).json({ error: 'Session expirée, veuillez vous reconnecter' });
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    include: { permissions: true },
  });
  if (!user || user.isDeleted) return res.status(401).json({ error: 'Session expirée, veuillez vous reconnecter' });

  const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

  // Rotation du refresh token — upsert pour éviter le crash si doublon race condition
  await prisma.refreshToken.deleteMany({ where: { token } });
  try {
    await prisma.refreshToken.create({
      data: { token: newRefreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });
  } catch {
    // Doublon très improbable (race) : on ignore, le token est déjà en base
  }

  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ accessToken });
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  const token = req.cookies?.refreshToken;
  let actorId = null, actorNom = 'Inconnu';
  if (token) {
    // Identifier l'utilisateur depuis le refresh token avant de le supprimer
    const stored = await prisma.refreshToken.findUnique({ where: { token } }).catch(() => null);
    if (stored) {
      const u = await prisma.user.findUnique({
        where: { id: stored.userId }, select: { id: true, nom: true },
      }).catch(() => null);
      actorId  = u?.id  ?? null;
      actorNom = u?.nom ?? 'Inconnu';
    }
    await prisma.refreshToken.deleteMany({ where: { token } });
  }
  await auditLog(
    { user: { id: actorId, nom: actorNom }, headers: req.headers, ip: req.ip },
    { action: 'auth.logout', targetType: 'User', targetId: actorId }
  );
  res.clearCookie('refreshToken');
  res.json({ message: 'Déconnecté' });
});

// GET /api/auth/me — renvoie le profil complet de l'utilisateur connecté
router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { permissions: true },
  });
  if (!user || user.isDeleted) return res.status(403).json({ error: 'Ce compte a été désactivé' });
  const { passwordHash, ...userSafe } = user;
  res.json(userSafe);
});

// PATCH /api/auth/password — changer son propre mot de passe
router.patch('/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Champs requis manquants' });
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(400).json({ error: 'Mot de passe actuel incorrect' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'Le nouveau mot de passe doit faire au moins 8 caractères' });
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash, mustChangePassword: false } });
    await auditLog(req, {
      action: 'auth.password.change',
      targetType: 'User', targetId: req.user.id, targetNom: req.user.nom,
      payload: { forced: false },
    });
    res.json({ message: 'Mot de passe mis à jour' });
  } catch (err) {
    console.error('Erreur PATCH /auth/password:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

module.exports = router;
