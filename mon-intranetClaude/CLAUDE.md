# CLAUDE.md — Intranet CDC (Cité des Chances)

Référence permanente du projet. À lire en début de session pour avoir le contexte complet.
Mise à jour : 2026-04-06

---

## Stack technique

| Couche | Tech |
|---|---|
| Frontend | React 18, Vite, CSS variables (thème clair/sombre) |
| Backend | Node.js / Express |
| ORM | Prisma |
| Base de données | **PostgreSQL** (Docker, port 5433) |
| Auth | JWT (access token en mémoire + refresh token en cookie httpOnly) |

**Démarrage :**
```
docker-compose up -d          # PostgreSQL sur port 5433
cd backend && node src/server.js
cd frontend && npm run dev
```

`.env` backend : `DATABASE_URL="postgresql://intranet:intranet_dev@localhost:5433/intranet_db"`

---

## Architecture frontend

```
src/
  api/
    apiClient.js          — fetch wrapper avec refresh token automatique
  contexts/
    AppContext.jsx         — UI state global (modales, navigation, toasts, highlights)
    AuthContext.jsx        — currentUser, JWT, login/logout
    DataContext.jsx        — TOUTES les données métier + handlers + analyticsStats (useMemo)
      ├── UserSliceContext
      ├── SpaceSliceContext
      ├── OperationsSliceContext
      ├── FinanceSliceContext
      └── CommsSliceContext
  pages/
    Dashboard.jsx
    ActionTracker.jsx      — tableau des actions, filtres, ouverture WizardModal/ActionModal
    Coordination.jsx       — événements + séances + validation présences responsable
    Planning.jsx           — calendrier 4 vues (Mois/Semaine/Agenda/Timeline)
    SpaceView.jsx          — pôles/projets : docs, chat, tâches, RH, NDF, missions…
    Analytics.jsx          — tableau de bord stats (5 onglets)
    Admin.jsx              — config NDF, catégories DF, fichiers préfaits
  components/modals/
    ActionModal.jsx        — modifier une action existante
    WizardModal.jsx        — créer une nouvelle action (workflow 4 étapes)
    EventModal.jsx         — créer/modifier un événement (onglet Événement + onglet Séances)
    DevisFactureModal.jsx
    MissionModal.jsx
    NoteFraisModal.jsx
    TransactionModal.jsx
  components/admin/
    NdfConfigPanel.jsx
    DfConfigPanel.jsx
  components/ui/
    ErrorBoundary.jsx
  utils/
    utils.js               — helpers partagés (parseDuree, formatDuree, generateAutoTasks…)
  data/
    constants.js           — POLES, PROJETS, TYPES_ACTION, NIVEAUX_CLASSE, POLE_COLORS…
```

---

## Modèle de données (Prisma / PostgreSQL)

### User (annuaire membres)
```
id, nom, prenom, avatar, pole, email, role, passwordHash
statut: "Actif" | "Congé" | "Inactif"
dateInscription, conges[]
isDeleted
```

### Action
```
id, etablissement, ville, departement, labelRep, institutionSimulee
adresse            ← adresse précise (ex: "15 rue de la Paix") — optionnel
type, type_classe, statut, cycle
date_debut, date_fin
responsables[]   (noms, pas IDs)
poles[], projet
beneficiaires (Int), bilan (JSON stringifié)
titreCoordination, notes
isArchived, timeline[], completionScore, checklist (JSON)
```
> `heures` supprimé du formulaire — les heures bénévoles viennent uniquement de SeancePresence.

### Evenement
```
id, titre, date, cycle, lieu, statut, isArchived
actionId (nullable — lien vers Action)
equipe[]         ← tous les membres de l'équipe (noms)
responsables[]   ← gestionnaires de l'évènement (sous-ensemble de equipe)
responsableNom   ← UN responsable pour la validation des présences (doit être dans equipe)
poles[], projet, whatsappLink
seances[]        ← JSON array de Seance
fichiers[]
```

**Hiérarchie des rôles dans un événement :**
- `equipe[]` = membres qui peuvent rejoindre/quitter et s'inscrire aux séances
- `responsables[]` = membres désignés gestionnaires (peuvent modifier l'événement, gérer séances) — **doivent être dans equipe**
- `responsableNom` = l'un des responsables désigné pour valider les présences bénévoles

**Règle de cascade** : quitter l'équipe retire automatiquement la personne de `responsables[]` et efface `responsableNom` si c'était elle (cascade côté backend ET frontend).

### Seance (sous-objet JSON dans Evenement.seances)
```
id              ← Date.now() à la création, stable ensuite
date, heure, libelle
duree           ← Float (heures décimales, ex: 2.5 pour "2h30")
inscrits[]      ← noms des membres inscrits (doivent être dans equipe)
bilan, annulee, raisonAnnulation, commentaireAnnulation
fichiers[]
```

### SeancePresence
```
id, evenementId (Int), evenementTitre
seanceId (String), seanceDate (String "YYYY-MM-DD")
membreNom, heures (Float)
resp1Statut: "en_attente" | "present" | "absent"
resp1Par, resp1At
rhStatut: "en_attente" | "confirme" | "rejete"
rhPar, rhAt
hourId (nullable — lien vers Hour créé automatiquement à confirmation RH)
createdAt, updatedAt
@@unique([evenementId, seanceId, membreNom])
```

### Hour (heures bénévoles validées)
```
id, userId (nullable), userNomSnapshot
eventId, type, hours (Float), date, status: "Validé"
```

### Task
```
id, text, space, deadline, status, actionId
assignees[]: { name, completed }
```

### NoteFrais
```
id, userId, montant, categorie, statut, linkedActionId
justificatif, description
```

### Transaction
```
id, libelle, montant, type: "Dépense"|"Recette", imputation (pôle/projet)
statut, date
```

### DevisFacture
```
id, type: "Devis"|"Facture", statut, montant, tiers
lignes[], categoryId
```

### ImpactStudy
```
id, cycle, typeAction, nbBeneficiaires, nbAteliers, nbEtablissements
heuresAccompagnement, heureMoyParBenef, nbBenevoles
notes
```

---

## Fonctionnalités par page

### Dashboard
- Vue synthétique : KPIs cycle en cours, alertes, dernières actions/tâches
- Raccourcis vers les sections principales
- **Alerte présences** : si `responsableNom === currentUser` sur un événement et qu'une séance passée a des présences `en_attente`, une KPI card orange + un bloc d'alerte s'affichent avec lien vers Coordination

### ActionTracker — Suivi des actions
- **Création** via `WizardModal` (4 étapes guidées) :
  - Étape 1 — Identification : type, établissement, localisation GeoSearch, label REP, contacts, coordination, projet
  - Étape 2 — Équipe & Dates : responsables, dates, notes
  - Étape 3 — Impact & Budget : bénéficiaires, type de classe, budget prévisionnel, espaces à notifier
  - Étape 4 — Automatisation : liste de tâches auto-générées (éditables), récapitulatif
- **Modification** via `ActionModal` (même champs, plus NDF liées et checklist)
- **Champs géographiques** :
  - `ville` : `GeoSearch` (API `geo.api.gouv.fr`) — recherche par nom ou code postal
  - `departement` : auto-rempli depuis GeoSearch, **toujours en lecture seule** (`<input readOnly>`), affiché `"93 — Seine-Saint-Denis"` via `DEPT_NAMES`
  - `adresse` : champ texte libre optionnel après ville/département (ex: "15 rue de la Paix, Bâtiment A") — affiché dans le raccourci terrain de Coordination
  - `labelRep` : Hors REP / REP / REP+
  - `institutionSimulee` : visible uniquement si `type` contient "Simulation" ou "COP"
- **Cycle** : assigné automatiquement = `cycles[0]`, jamais exposé à l'utilisateur dans le wizard
- **type_classe** : niveau scolaire du public touché (select depuis `NIVEAUX_CLASSE`)
- Checklist de préparation auto-intégrée à chaque action
- Tâches auto-créées dans les bons pôles à la validation du wizard
- Tableau filtrable par statut, pôle, responsable, cycle

### Coordination — Événements & Séances

**EventModal** — modale en deux onglets :
- **Onglet "Événement"** : titre, date/lieu, description, statut/cycle, action liée, projet, pôles
  - Section Équipe : liste des membres avec icône Shield cliquable pour promouvoir/rétrograder en responsable
  - Section Responsable validation : sélecteur parmi les `responsables[]` uniquement
- **Onglet "Séances"** : formulaire ajout + liste éditable (titre, date, heure, durée, bilan, à venir, annulation)
  - Tous les champs des séances existantes sont éditables (titre, date, heure inclus)

**Vue détail Coordination.jsx** :
- Barre métadonnées (date, lieu, cycle, pôles) compacte
- Section Équipe avec badges membres ; icône Shield vert sur le responsableNom
- Section Responsables de l'évènement (visible par **tous** les membres) avec ajout/retrait inline conditionné à `canEditEvent`
- Sélecteur responsableNom conditionné : propose uniquement les membres de `responsables[]`
- Section séances avec bouton "Gérer" pour les `canEditEvent`

**Permissions sur un événement :**
- `canManageEvent = isAdmin || isResponsable || isActionResponsable || isEventResponsable`
- `canEditEvent = canManageEvent && !isArchived`
- Un membre sans ces rôles peut seulement : rejoindre/quitter l'équipe, s'inscrire/se désinscrire des séances
- **S'inscrire à une séance nécessite d'être dans l'équipe** (guard frontend + logique backend)

**Règles d'accès backend self-service (PUT /events/:id) :**
- Non-responsable : uniquement `equipe` et `seances` autorisés dans le body
- Validation : equipe ne peut être modifiée que pour soi-même ; seances uniquement pour ses propres inscrits
- **Ne JAMAIS envoyer le body complet de l'événement depuis un membre standard** → 403 silencieux
- `joinEventTeam` envoie uniquement `{ equipe }`, `removeEventTeamMember` envoie uniquement `{ equipe, seances }`

**Séances** :
- `duree` : saisie format **2h30**, stockée en Float
- `inscrits[]` : membres inscrits à la séance — doivent être dans `equipe`
- Validation présences : visible uniquement pour le `responsableNom`

**Validation présences** :
- "Générer les fiches" → `POST /api/seance-presences/generate` (idempotent)
- Boutons Présent / Absent par membre inscrit
- "Corriger" disponible après première validation
- Badge "✓ Complète" quand tous les membres sont validés

### Planning — Calendrier
- 4 vues : **Mois**, **Semaine**, **Agenda**, **Timeline**
- Items affichés : Action, Événement standalone, Séance, Tâche
- **Fusion** Action + Événement lié : rendu bicolore (bordure gauche Action, droite Événement)
- Filtres : par type, par membre ("Mon agenda" ou autre)
- **Légende groupée** :
  - Groupe Type : Action · Événement · Séance · Tâche (puces rondes colorées)
  - Groupe Spécial : fusion bicolore · En retard · Alerte J-1
- Panel alertes J-1 au-dessus du calendrier (cliquable → navigation vers l'item)
- Glisser-déposer dates (selon les vues)

### SpaceView — Espaces Pôles & Projets
- Un espace par pôle + par projet (depuis `POLES` et `PROJETS`)
- **Onglets** :
  - `docs` : documents, dossiers, fichiers préfaits
  - `chat` : mur de discussion par espace
  - `tasks` : gestion des tâches (kanban/liste)
  - `ndf` : notes de frais (soumission, validation, remboursement) — **sans bouton config** (config dans Admin uniquement)
  - `rh_suivi` (pôle RH uniquement) : suivi bénévoles + **validation RH des heures**
  - `rh_missions` (pôle RH uniquement) : missions bénévoles, candidatures
  - `tresorerie` (pôle Trésorerie uniquement) : transactions, budgets, devis/factures
- **Validation RH des heures** (onglet `rh_suivi`) :
  - Liste des `SeancePresence` avec `resp1Statut ≠ en_attente` et `rhStatut = en_attente`
  - Boutons Confirmer / Rejeter par ligne
  - Sur confirmation → création automatique d'un `Hour` en DB
  - Sur rejet → suppression de l'`Hour` si existant
  - Historique des 20 dernières validations finalisées
- **Règle hooks** : tous les `useState` de SpaceView sont déclarés au niveau du composant principal, jamais dans des IIFEs conditionnelles. Préfixes par onglet (ex: `rhmView`, `setRhmView` pour `rh_missions`).

### Analytics — Tableau de bord
- Sélecteur de cycle en haut (+ "Tous cycles")
- **Panneau alertes intelligentes** (affiché en haut, badge sur l'onglet) :
  - Taux d'annulation séances ≥ 25%
  - Budget pôle ≥ 80% (warning) ou dépassement (danger)
  - Bénévole avec 6+ tâches actives (surcharge)
  - 5+ NDF en attente de traitement
  - Actions en retard sur date de fin prévue
- **KPIs** avec delta ↑↓ vs cycle précédent
- **Onglet Vue d'ensemble** :
  - Statuts des actions, bénéficiaires par mois, types d'actions
  - Velocity complétion (actions terminées par mois)
  - Raisons d'annulation des séances
  - Heures bénévoles par type d'activité
- **Onglet Actions** :
  - Satisfaction bilan : distribution étoiles 1-5, moyenne, extraits points positifs
  - Top 5 actions par bénéficiaires
  - Répartition par pôle, par type d'action
  - **Par niveau scolaire** (`type_classe`)
  - **Par zone prioritaire** (`labelRep`) : % en REP/REP+ mis en évidence
  - **Par département** (nombre de dép. couverts)
  - **Par institution simulée** (uniquement si simulations existent)
  - Tableau détaillé avec bilan étoiles, tâches, NDF par action
- **Onglet Bénévoles** :
  - Top 10 heures par personne, charge tâches, membres par statut
  - Heures par type d'activité, ratio bénéficiaires/heure
- **Onglet Finances** :
  - Budget par pôle (alloué vs dépensé)
  - NDF par catégorie, KPI coût/bénéficiaire
- **Onglet Rapport** :
  - Rapport d'impact auto-calculé (séances, établissements, heures)
  - Études d'impact manuelles (CRUD)

### Admin
- Configuration NDF (catégories, plafonds, délais, instructions) — **seul endroit pour configurer les NDF**
- Configuration catégories Devis/Factures
- Fichiers préfaits par espace

---

## Système heures bénévoles (flux complet)

```
EventModal (onglet Séances)
  └── Séance.duree (saisie "2h30" → parseDuree → Float 2.5 stocké)
  └── Séance.inscrits (membres inscrits — doivent être dans equipe)

POST /api/seance-presences/generate   (idempotent, upsert update:{})
  └── Crée une SeancePresence par (evenementId, seanceId, membreNom)
  └── resp1Statut = "en_attente", rhStatut = "en_attente"

Coordination.jsx — responsableNom valide
  └── PATCH /api/seance-presences/:id/resp  { statut: "present"|"absent" }
  └── Vérifie: ev.responsableNom === req.user.nom  OU  Admin/Bureau
  └── Met à jour resp1Statut, resp1Par, resp1At
  └── Frontend: fetchSeancePresences() → re-fetch complet depuis DB

SpaceView.jsx (rh_suivi) — RH valide
  └── PATCH /api/seance-presences/:id/rh  { statut: "confirme"|"rejete" }
  └── Vérifie: Admin | Bureau | pole === "Ressources Humaines"
  └── Si confirme → crée Hour { type:"Animation", hours, status:"Validé" }
  └── Si rejete  → supprime Hour si hourId existe
  └── Frontend: fetchSeancePresences() + recharge volunteerHours
```

**Règle de persistance :**
- Après chaque PATCH (resp ou rh), `fetchSeancePresences()` re-fetch TOUT depuis la DB (pas de patch local d'état)
- Au chargement initial, `loadAllData` fait toujours `POST /generate` PUIS `GET /seance-presences` (sans condition sur `generated`)

---

## GeoSearch — Recherche ville/département

**Composant** : déclaré en haut de `ActionModal.jsx` ET `WizardModal.jsx` (copie locale dans chaque fichier).

**Comportement :**
- Saisie texte libre (ville ou code postal)
- Debounce 350ms → appel `geo.api.gouv.fr/communes`
  - Si input numérique → `?codePostal=XX`
  - Sinon → `?nom=XX&boost=population`
- Dropdown `position: fixed` avec coordonnées calculées par `getBoundingClientRect()` (échappe le `overflow:auto` de la modale)
- Icône loupe (en attente) → ✓ vert (ville confirmée)
- Sur sélection : remplit `form.ville` + `form.departement`

**Département :**
- Toujours `<input readOnly opacity:0.6>`
- Affiche `"93 — Seine-Saint-Denis"` quand rempli (code + `DEPT_NAMES[code]`)
- Affiche `"Sélectionnez une ville d'abord"` en placeholder quand vide
- JAMAIS éditable manuellement
- `DEPT_NAMES` : dictionnaire complet 101 départements (métropole + DOM), défini dans chaque fichier modal

---

## Formats et conventions

| Donnée | Stockage | Affichage |
|---|---|---|
| Durée séance / heures bénévoles | `Float` (2.5) | `formatDuree(2.5)` → `"2h30"` |
| Saisie durée | texte libre `"2h30"` | `parseDuree("2h30")` → `2.5` |
| Département | `String` `"93"` | `"93 — Seine-Saint-Denis"` via `DEPT_NAMES` |
| Bilan action | `String` (JSON.stringify) | parsé à la lecture |
| Seance.id | `Date.now()` à la création | stable, jamais regénéré |
| SeancePresence.seanceId | `String(s.id)` | comparé avec `String(s.id)` |

**Cycles** : `"2025-2026"` etc. · `cycles[0]` = cycle actif · jamais exposé dans le WizardModal

**Rôles système** : `Admin` > `Bureau` > `Responsable` (espace) > membre standard

**Rôles événement** : `responsables[]` (gestionnaires) > membres `equipe[]` > visiteurs

**Statuts action** : `Planifiée` · `En cours` · `Terminée` · `Annulée`

**Statuts NDF** : `Brouillon` → `Soumise` → `En vérification` → `Validée` → `Remboursée` (ou `Refusée`)

**Statuts SeancePresence resp** : `en_attente` → `present` | `absent`

**Statuts SeancePresence RH** : `en_attente` → `confirme` | `rejete`

---

## Helpers utils.js (principaux)

```js
parseDuree(str)      // "2h30" → 2.5 | "1h" → 1 | "30min" → 0.5 | "2.5" → 2.5
formatDuree(n)       // 2.5 → "2h30" | 1 → "1h" | 0.75 → "0h45"
formatDateShort(d)   // "2025-11-03" → "3 nov. 2025"
generateAutoTasks(form, cycle)  // génère les tâches checklist pour une action
isPastDate(d)        // true si date < aujourd'hui
isTaskEffectivelyDone(t)        // true si terminé ou tous assignés validés
```

---

## Routes backend principales

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/seance-presences` | Toutes les présences |
| POST | `/api/seance-presences/generate` | Génère présences manquantes (idempotent) |
| PATCH | `/api/seance-presences/:id/resp` | Validation responsable |
| PATCH | `/api/seance-presences/:id/rh` | Validation RH (crée/supprime Hour) |
| GET/POST/PUT | `/api/actions` | CRUD actions |
| GET/POST/PUT | `/api/events` | CRUD événements |
| GET/POST | `/api/hours` | Heures bénévoles |
| GET/POST/PATCH | `/api/notes-frais` | NDF |
| GET/POST/PUT/DELETE | `/api/impact-studies` | Études d'impact |
| GET/POST/PATCH | `/api/devis-factures` | Devis et factures |

---

## Pièges et règles à ne pas oublier

1. **Hooks dans SpaceView** : tous les `useState` au niveau du composant, jamais dans des IIFEs ou conditions. Utiliser préfixes par onglet (`rhmX` pour `rh_missions`, etc.).

2. **GeoSearch dropdown** : doit utiliser `position: fixed` + `getBoundingClientRect()`. Sans ça, le dropdown est coupé par le `overflow:auto` de la modale.

3. **Département toujours readOnly** : ne jamais remettre un `<input>` éditable pour le département. Il est rempli exclusivement via GeoSearch.

4. **Cycle dans WizardModal** : ne JAMAIS ajouter un sélecteur de cycle dans le wizard. Le cycle est `cycles[0]` automatiquement.

5. **fetchSeancePresences vs patch local** : après toute validation (resp ou RH), toujours appeler `fetchSeancePresences()` pour re-fetch depuis la DB. Ne jamais patcher l'état local manuellement.

6. **generate idempotent** : `POST /generate` utilise Prisma `upsert` avec `update: {}`. Appelable autant de fois que nécessaire, ne réinitialise jamais les validations existantes.

7. **Erreurs apiClient** : l'api client throw `new Error(message)` (pas Axios). Dans les catch, utiliser `err.message`, pas `err.response?.data?.error`.

8. **formatDuree dans les imports** : l'importer depuis `utils/utils.js` dans tout fichier qui affiche des durées (Analytics, SpaceView, EventModal…).

9. **DEPT_NAMES** : défini localement dans `ActionModal.jsx` et `WizardModal.jsx` (même contenu). Si on crée un nouveau composant qui en a besoin, le définir aussi localement ou extraire dans `utils/utils.js`.

10. **joinEventTeam / removeEventTeamMember** : envoyer UNIQUEMENT `{ equipe }` ou `{ equipe, seances }` — jamais le body complet. Un membre standard obtient un 403 silencieux si d'autres champs sont envoyés (self-service strict côté backend).

11. **Cascade équipe → responsables** : le backend cascade automatiquement : si `equipe` change dans un PUT, tout membre absent de la nouvelle équipe est retiré de `responsables[]` et `responsableNom` est effacé si nécessaire. Ne pas gérer ça côté frontend uniquement.

12. **responsables[] ⊆ equipe[]** : toujours vrai. On ne peut être responsable d'un événement sans en être membre. Validé à la fois côté backend (`validateEventConstraints`) et frontend (sélecteur filtré).

13. **responsableNom doit être dans equipe** : validé backend. Le sélecteur dans Coordination propose uniquement les membres de `responsables[]` (pas toute l'équipe).

14. **NDF config** : accessible uniquement depuis Admin. Le bouton config a été retiré de NoteFrais.jsx.

15. **pickActionFields est partial-update safe** : la fonction backend utilise `'field' in body` pour n'inclure que les champs présents dans la requête. En particulier `ville`, `date_debut`, `date_fin` ne sont inclus que si présents — évite que des mises à jour partielles (ex: status-only) écrasent ces champs avec `null` dans Prisma.

16. **Boutons archive/modifier/supprimer en Coordination** : rendu sous forme d'icônes carrées 32×32px avec `title` tooltip. Pas de texte.

17. **Notification présences Dashboard** : calculée client-side depuis `seancePresences` + `evenements`. Cherche les séances passées non annulées où `event.responsableNom === currentUser.nom` et il existe des présences `resp1Statut === 'en_attente'`. Affiche KPI card orange + bloc alerte avec liste des séances concernées.
