# Intranet — Cité des Chances

Intranet interne de l'association Cité des Chances. Gestion des actions, événements, tâches, trésorerie, messagerie, missions, notes de frais et annuaire des membres.

---

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React 19 + Vite 5 |
| Backend | Node.js + Express 5 |
| ORM | Prisma 5 |
| Base de données | PostgreSQL 16 |
| Auth | JWT (access 15min) + Refresh token httpOnly cookie (7j) |
| Upload fichiers | Multer (stockage local `/backend/uploads/`) |
| Conteneur DB | Docker |

---

## Prérequis

- [Node.js](https://nodejs.org/) v20+ (LTS recommandé)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (pour PostgreSQL)
- npm v10+

---

## Installation — première fois

### 1. Cloner le dépôt

```bash
git clone <url-du-repo>
cd mon-intranetClaude
```

### 2. Démarrer la base de données

```bash
docker compose up -d
```

Cela lance PostgreSQL 16 sur le port **5433** avec les credentials :
- User : `intranet`
- Password : `intranet_dev`
- Database : `intranet_db`

### 3. Configurer le backend

```bash
cd backend
cp .env.example .env
npm install
```

Edite `.env` si besoin (les valeurs par défaut fonctionnent pour le développement local).

Initialise la base de données et charge les données de test :

```bash
npm run db:reset
```

Cette commande crée les tables Prisma et insère les 7 comptes utilisateurs de démonstration.

### 4. Configurer le frontend

```bash
cd ../frontend
cp .env.example .env
npm install
```

---

## Lancer le projet en développement

Ouvre **deux terminaux** :

**Terminal 1 — Backend** (port 3001)
```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend** (port 5173)
```bash
cd frontend
npm run dev
```

Accès : [http://localhost:5173](http://localhost:5173)

---

## Comptes de démonstration

Tous les comptes ont le mot de passe par défaut : `Intranet2026!`

| Nom | Email | Rôle |
|---|---|---|
| Lauren Lolo | lauren@citedeschances.com | Admin |
| Aryles Attou | aryles@citedeschances.com | Bureau |
| Kevin Traoré | kevin@citedeschances.com | Éditeur |
| Inès Margot | ines@citedeschances.com | Éditeur |
| Djibril Koné | djibril@citedeschances.com | Éditeur |
| Laura Pizot | laura@citedeschances.com | Éditeur |
| Sonia Rahim | sonia@citedeschances.com | Lecteur |

**En production**, changer immédiatement tous les mots de passe via la page Permissions → Réinitialiser MDP.

---

## Structure du projet

```
mon-intranetClaude/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Schéma de la base de données
│   │   └── seed.js             # Données de démo
│   ├── src/
│   │   ├── middleware/
│   │   │   └── auth.js         # Middleware JWT
│   │   ├── routes/             # Une route = un domaine métier
│   │   │   ├── auth.js         # Login, logout, refresh, password
│   │   │   ├── users.js        # Profils, création, suppression, permissions
│   │   │   ├── actions.js      # Suivi des actions terrain
│   │   │   ├── events.js       # Événements / séances
│   │   │   ├── tasks.js        # Tâches et demandes de tâches
│   │   │   ├── tresorerie.js   # Transactions, budgets, notes de frais
│   │   │   ├── missions.js     # Bourse aux missions
│   │   │   ├── messagerie.js   # Conversations et messages
│   │   │   ├── notifications.js# Annonces
│   │   │   ├── hours.js        # Heures bénévoles
│   │   │   ├── spaces.js       # Paramètres des espaces (teams, sections, docs)
│   │   │   └── upload.js       # Upload de fichiers (Multer)
│   │   └── server.js           # Point d'entrée Express
│   ├── uploads/                # Fichiers uploadés (non versionnés)
│   ├── .env                    # Variables d'environnement (non versionné)
│   └── .env.example            # Modèle à copier
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── apiClient.js    # Fetch wrapper avec refresh token auto
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx # Gestion de la session utilisateur
│   │   ├── components/
│   │   │   ├── layout/         # Layout principal  nbh+ sidebar
│   │   │   ├── modals/         # Toutes les modales
│   │   │   └── ui/             # Composants réutilisables
│   │   ├── pages/              # Une page = une route
│   │   ├── data/
│   │   │   └── constants.js    # Listes statiques (pôles, projets, types...)
│   │   ├── utils/
│   │   │   └── utils.js        # Fonctions utilitaires
│   │   ├── App.jsx             # État global + routage
│   │   └── index.css           # Styles globaux + design system
│   ├── .env                    # Variables d'environnement (non versionné)
│   └── .env.example            # Modèle à copier
│
├── docker-compose.yml          # PostgreSQL en conteneur
└── .gitignore
```

---

## Variables d'environnement

### Backend (`backend/.env`)

| Variable | Description | Exemple |
|---|---|---|
| `DATABASE_URL` | URL de connexion PostgreSQL | `postgresql://intranet:intranet_dev@localhost:5433/intranet_db` |
| `JWT_SECRET` | Clé de signature des access tokens | Chaîne aléatoire 64+ chars |
| `JWT_REFRESH_SECRET` | Clé de signature des refresh tokens | Chaîne aléatoire 64+ chars (différente) |
| `PORT` | Port du serveur backend | `3001` |
| `FRONTEND_URL` | URL du frontend (CORS) | `http://localhost:5173` |

### Frontend (`frontend/.env`)

| Variable | Description | Exemple |
|---|---|---|
| `VITE_API_URL` | URL de base de l'API backend | `http://localhost:3001/api` |
| `VITE_SERVER_URL` | URL du serveur (pour les fichiers uploadés) | `http://localhost:3001` |

> Les variables frontend **doivent** commencer par `VITE_` pour être exposées par Vite.

---

## Commandes utiles

### Backend

```bash
# Démarrage développement (hot reload)
npm run dev

# Démarrage production
npm start

# Réinitialiser la DB + recharger les données de démo
npm run db:reset

# Appliquer les migrations Prisma (après modification du schéma)
npx prisma migrate dev --name <nom-de-la-migration>

# Synchroniser le schéma sans migration (dev rapide)
npx prisma db push

# Interface graphique de la DB
npm run db:studio
```

### Frontend

```bash
# Démarrage développement
npm run dev

# Build de production
npm run build

# Prévisualiser le build
npm run preview

# Linter
npm run lint
```

### Docker

```bash
# Démarrer la DB
docker compose up -d

# Arrêter la DB
docker compose down

# Voir les logs
docker compose logs -f postgres

# Accéder à psql directement
docker exec -it intranet-postgres psql -U intranet -d intranet_db
```

---

## Système d'authentification

- **Login** : `POST /api/auth/login` → retourne un `accessToken` (JWT, 15min) + cookie httpOnly `refreshToken` (7j)
- **Refresh** : `POST /api/auth/refresh` → échange le cookie refresh contre un nouvel access token
- **Auto-refresh** : `apiClient.js` réessaie automatiquement à 401
- **Logout** : invalide le refresh token en base + supprime le cookie

### Rôles

| Rôle | Droits |
|---|---|
| `Admin` | Accès complet, gestion des comptes et permissions |
| `Bureau` | Accès à l'Espace Bureau, lecture de tous les pôles |
| `Éditeur` | Interaction dans les espaces où il est membre |
| `Lecteur` | Lecture seule dans les espaces autorisés |

### Reset de mot de passe (admin)

1. Aller dans **Permissions** → sélectionner un membre → **Réinitialiser MDP**
2. Un code temporaire (`XXXX-XXXX`) est généré et affiché
3. Transmettre le code au membre
4. Au prochain login, une modale lui demande de définir un nouveau mot de passe

---

## API — Routes principales

```
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me
PATCH  /api/auth/password

GET    /api/users
POST   /api/users                        # Admin
PATCH  /api/users/:id
DELETE /api/users/:id                    # Admin
POST   /api/users/:id/reset-password     # Admin

GET/POST/PUT/DELETE  /api/actions
GET/POST/PUT/DELETE  /api/events
GET/POST/PUT/DELETE  /api/tasks
GET/POST/DELETE      /api/tasks/requests
GET/POST/PUT/DELETE  /api/tresorerie/transactions
GET/POST/PUT         /api/tresorerie/budgets
GET/POST/PUT/DELETE  /api/tresorerie/notes-frais
GET/POST/PUT/DELETE  /api/missions
GET/POST/PATCH       /api/notifications
GET/POST/PATCH       /api/hours
GET/POST             /api/messagerie/conversations
GET/POST             /api/messagerie/conversations/:id/messages
GET/POST             /api/messagerie/space-chats/:space
GET                  /api/spaces/settings
PUT                  /api/spaces/:space/settings/:key
POST                 /api/upload
GET                  /api/health
```

---

## Déploiement en production

### Checklist avant mise en ligne

- [ ] Générer de nouveaux secrets JWT (ex: `openssl rand -hex 64`)
- [ ] Mettre à jour `FRONTEND_URL` avec le vrai domaine
- [ ] Mettre à jour `VITE_API_URL` et `VITE_SERVER_URL` avec le vrai domaine
- [ ] Passer `secure: true` sur les cookies (backend/src/routes/auth.js) si HTTPS
- [ ] Changer `NODE_ENV=production` dans le `.env` backend
- [ ] Changer tous les mots de passe des comptes de démo
- [ ] Configurer un reverse proxy (Nginx/Caddy) devant le backend
- [ ] Activer HTTPS (Let's Encrypt / Caddy automatique)
- [ ] Builder le frontend : `npm run build` → servir le dossier `dist/`

### Génération de secrets sécurisés

```bash
# Linux/macOS
openssl rand -hex 64

# Node.js (cross-platform)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Dépannage

### La DB ne démarre pas
```bash
docker compose down -v   # Supprime aussi le volume
docker compose up -d
```

### Erreur Prisma "table does not exist"
```bash
cd backend && npx prisma db push
```

### Erreur Vite "Cannot find native binding" (Windows)
Problème de politique Application Control Windows. Downgrader Vite 5 règle le problème (déjà configuré).

### Port 5433 déjà utilisé
Changer le port dans `docker-compose.yml` et `backend/.env` (partie `@localhost:5433`).

---

## Conventions de développement

- **Nouvelles routes backend** : ajouter dans `backend/src/routes/`, monter dans `server.js`. Express 5 gère les erreurs async automatiquement — pas besoin de try/catch systématique.
- **Nouvelles pages frontend** : créer dans `frontend/src/pages/`, importer dans `App.jsx`, ajouter dans le switch de rendu et dans `Layout.jsx` si visible dans la nav.
- **Nouvelles constantes** (pôles, types...) : modifier `frontend/src/data/constants.js`.
- **Icônes** : utiliser [Lucide React](https://lucide.dev/) uniquement, pas d'emojis dans l'UI.
- **Variables d'env frontend** : préfixer obligatoirement par `VITE_`.
- **Jamais committer** `.env` — utiliser `.env.example` comme modèle.
