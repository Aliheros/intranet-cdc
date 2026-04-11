require('dotenv').config();
const express = require('express');
const log = require('./lib/logger');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const actionsRoutes = require('./routes/actions');
const eventsRoutes = require('./routes/events');
const tasksRoutes = require('./routes/tasks');
const tresorerieRoutes = require('./routes/tresorerie');
const missionsRoutes = require('./routes/missions');
const messagerieRoutes = require('./routes/messagerie');
const notificationsRoutes = require('./routes/notifications');
const hoursRoutes = require('./routes/hours');
const spacesRoutes = require('./routes/spaces');
const uploadRoutes = require('./routes/upload');
const contactsRoutes = require('./routes/contacts');
const adminRoutes    = require('./routes/admin');
const cyclesRoutes   = require('./routes/cycles');
const faqRoutes          = require('./routes/faq');
const devisFacturesRoutes = require('./routes/devis-factures');
const categoriesDfRoutes  = require('./routes/categories-df');
const impactStudiesRoutes    = require('./routes/impact-studies');
const seancePresencesRoutes  = require('./routes/seance-presences');
const automationRulesRoutes  = require('./routes/automation-rules');
const { startAutomationCron } = require('./lib/automationCron');

const app = express();

// Sécurité HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-site' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'"],
      styleSrc:    ["'self'", "'unsafe-inline'"], // inline styles React
      imgSrc:      ["'self'", 'data:', 'blob:'],
      connectSrc:  ["'self'", process.env.FRONTEND_URL || 'http://localhost:5173'],
      fontSrc:     ["'self'", 'data:'],
      objectSrc:   ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
}));
// Compression gzip des réponses
app.use(compression());

// ─── Rate limiting ────────────────────────────────────────────────────────────
// Limiteur global : toutes les routes API (utilisateur authentifié ou non)
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,     // 1 minute
  max: 300,                // 300 req / min / IP (seuil confortable pour usage normal)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes. Veuillez patienter.' },
  skip: (req) => req.path === '/api/health', // exclure le health check
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,     // 1 minute
  max: 15,                 // 15 tentatives de connexion / min / IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Réessayez dans une minute.' },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,                 // 30 uploads / min / IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de fichiers uploadés. Réessayez dans une minute.' },
});

// Origines de base (développement local) + celles définies dans ALLOWED_ORIGINS (virgule séparées)
const baseOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
];
const extraOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : [];
const allowedOrigins = [...new Set([
  process.env.FRONTEND_URL,
  ...baseOrigins,
  ...extraOrigins,
].filter(Boolean))];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, origin || allowedOrigins[0]);
    cb(new Error(`Origine CORS non autorisée : ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '15mb' }));
app.use(cookieParser());

// Avatars — seul sous-dossier public (photos de profil non sensibles)
// Tous les autres uploads passent par /api/upload/secure/:filename (route authentifiée)
app.use('/uploads/avatars', express.static(path.join(__dirname, '../uploads/avatars')));

// Rate limiting global sur toutes les routes API
app.use('/api', globalLimiter);

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/upload', uploadLimiter);
app.use('/api/users', usersRoutes);
app.use('/api/actions', actionsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/tresorerie', tresorerieRoutes);
app.use('/api/missions', missionsRoutes);
app.use('/api/messagerie', messagerieRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/hours', hoursRoutes);
app.use('/api/spaces', spacesRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/admin',   adminRoutes);
app.use('/api/cycles',  cyclesRoutes);
app.use('/api/faq',            faqRoutes);
app.use('/api/devis-factures', devisFacturesRoutes);
app.use('/api/categories-df',  categoriesDfRoutes);
app.use('/api/impact-studies',    impactStudiesRoutes);
app.use('/api/seance-presences',  seancePresencesRoutes);
app.use('/api/automation-rules',  automationRulesRoutes);

// Health check
app.get('/', (req, res) => res.json({ status: 'ok', message: 'Intranet API' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Gestion globale des erreurs (Express 5 catch async automatiquement)
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';
  log.error({ method: req.method, path: req.path, status, err: isProd ? undefined : err }, err.message);
  if (!isProd) log.debug(err.stack);

  // Prisma-specific errors → messages lisibles
  let message = err.message || 'Erreur serveur interne';
  if (err.code === 'P2002') {
    message = 'Conflit : une entrée avec ces données existe déjà.';
  } else if (err.code === 'P2025') {
    message = 'Enregistrement introuvable.';
  } else if (err.code === 'P1008' || err.message?.includes('timed out')) {
    message = 'La base de données ne répond pas (timeout). Vérifiez que PostgreSQL est démarré.';
  } else if (err.message?.includes('does not exist in the current database') || err.message?.includes("Can't reach database server")) {
    message = 'La base de données n\'est pas à jour. Lancez la migration : npx prisma migrate dev';
  } else if (err.message?.includes('ECONNREFUSED') || err.message?.includes('connect ECONNREFUSED')) {
    message = 'Impossible de se connecter à la base de données. Vérifiez que PostgreSQL est démarré sur le port configuré.';
  } else if (err.message?.includes('Unknown field') || err.message?.includes('Unknown argument')) {
    message = 'Erreur de schéma Prisma. Relancez : npx prisma generate && npx prisma migrate dev';
  }

  if (isProd && status === 500) message = 'Erreur serveur interne';

  res.status(status).json({ error: message });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  log.info({ port: PORT, env: process.env.NODE_ENV || 'development' }, 'Backend démarré');
  startAutomationCron();
});
