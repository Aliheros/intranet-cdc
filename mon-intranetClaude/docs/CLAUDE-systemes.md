# CLAUDE-systemes.md — Systèmes transverses

## Design system Glass + Topbar

**Source unique** : `src/styles/glass.css` — importer ce seul fichier change le style glass partout.

**Fond animé** : classe `main-gradient` sur `<main>` dans `Layout.jsx`.
Pour l'activer sur une nouvelle page, modifier la condition dans Layout :
```jsx
className={`main ${page === 'dashboard' || page === 'mapage' ? 'main-gradient' : ''}`}
```

**Cartes glass** : `.main-gradient .kc` et `.main-gradient .sc` sont stylés automatiquement. Pour un glass sans gradient, ajouter la classe `glass-card` directement.

**Tilt 3D** : `useEffect` dans `Dashboard.jsx` cible `.kpi-grid .kc` et `.dash-two-col .sc`. Pour d'autres pages, copier le même pattern ou extraire dans `src/hooks/useTilt.js`.

**Topbar** : rendu dans `Layout.jsx` à l'intérieur de `<main>`, sticky via `position: sticky; top: 0`. Contient :
- Breadcrumb (computed depuis `PAGE_LABELS` + `page`/`subPage`)
- Barre de recherche globale (déplacée depuis l'ancien emplacement dans `<main>`)
- Thème toggle (déplacé depuis `s-bottom` sidebar)
- Cloche notifications + mini-dropdown (5 items récents, bouton "Voir tout" ouvre le panel existant)
- Avatar profil + dropdown (Mon profil → `openProfile`, Déconnexion → `onLogout`)

**Intégrité** : `padding: 0` sur `<main>` (inline), contenu dans `<div style={{ padding: '28px 44px 44px' }}>`.

---

## GeoSearch — Recherche ville/département/arrondissement

**Composant** : copie locale dans `ActionModal.jsx` ET `WizardModal.jsx` (pas de composant partagé).

**Comportement** :
- Debounce 350ms → `geo.api.gouv.fr/communes`
  - Input numérique → `?codePostal=XX` · sinon → `?nom=XX&boost=population`
- Dropdown `position: fixed` + `getBoundingClientRect()` — échappe le `overflow:auto` de la modale
- Loupe → ✓ vert après sélection
- `onSelect({ ville, departement, codesPostaux })` — parent reçoit les 3 valeurs

**Département** : toujours `<input readOnly>` · jamais éditable · `DEPT_NAMES` défini localement dans chaque fichier modal (101 depts métropole + DOM)

**Arrondissement** : `<select>` si `codesPostaux.length > 1` · état local `geoPostalCodes` · réinitialisé à `''` au changement de ville · en édition : reste visible si `form.arrondissement` déjà renseigné

---

## Système heures bénévoles (flux complet)

```
EventModal (onglet Séances)
  └── Séance.duree : saisie "2h30" → parseDuree → Float 2.5 stocké
  └── Séance.inscrits : membres (doivent être dans equipe)

POST /api/seance-presences/generate   (idempotent — upsert update:{})
  └── Crée SeancePresence par (evenementId, seanceId, membreNom)
  └── resp1Statut = "en_attente", rhStatut = "en_attente"

Coordination.jsx — responsableNom valide
  └── PATCH /api/seance-presences/:id/resp  { statut: "present"|"absent" }
  └── Guard: ev.responsableNom === req.user.nom OU Admin/Bureau
  └── Frontend: fetchSeancePresences() → re-fetch complet

SpaceView rh_suivi — RH valide
  └── PATCH /api/seance-presences/:id/rh  { statut: "confirme"|"rejete" }
  └── Guard: Admin | Bureau | pole === "Ressources Humaines"
  └── confirme → crée Hour { type:"Animation", status:"Validé" }
  └── rejete  → supprime Hour si hourId existe
  └── Frontend: fetchSeancePresences() + recharge volunteerHours
```

**Règles** :
- Après chaque PATCH → `fetchSeancePresences()` re-fetch tout (pas de patch local)
- Au chargement : `POST /generate` PUIS `GET /seance-presences` (toujours, sans condition)

---

## Système d'automatisation

**Moteur** : `backend/src/lib/automationCron.js` · cron `node-cron` à **06:00 Europe/Paris**

**Flux** :
```
Admin crée une AutomationRule (Admin > Paramètres > Automatisation)
  ↓
Cron 06:00 → runAllAutomationRules()
  ↓
Pour chaque règle active :
  - actions où [triggerDateRef] === today + triggerOffsetDays
  - filtre actionTypeFilter si non vide
  - skip si AutomationExecution existe déjà (@@unique ruleId+actionId)
  ↓
TaskRequest { requestedBy: "automatique", space: targetPole, actionId }
AutomationExecution créée (verrou idempotent)
```

**Route test** : `POST /api/automation-rules/:id/run` → `{ triggered, skipped, errors }` · bouton "Tester" dans l'UI admin

**Règles** :
- Auteur `"automatique"` : intentionnel, à corriger si besoin de traçabilité nominative
- Une règle = max 1 exécution par action (AutomationExecution unique)
- Cron démarre dans `server.js` via `startAutomationCron()` au boot

---

## Routes backend principales

| Méthode | Route | Description |
|---|---|---|
| GET/POST/PUT | `/api/actions` | CRUD actions |
| GET/POST/PUT | `/api/events` | CRUD événements |
| GET/POST | `/api/hours` | Heures bénévoles |
| GET | `/api/seance-presences` | Toutes les présences |
| POST | `/api/seance-presences/generate` | Génère présences (idempotent) |
| PATCH | `/api/seance-presences/:id/resp` | Validation responsable |
| PATCH | `/api/seance-presences/:id/rh` | Validation RH (crée/supprime Hour) |
| GET/POST/PATCH | `/api/notes-frais` | NDF |
| GET/POST/PATCH | `/api/devis-factures` | Devis et factures |
| GET/POST/PUT/DELETE | `/api/impact-studies` | Études d'impact |
| GET/POST/PUT/DELETE | `/api/automation-rules` | Règles d'automatisation (Admin/Bureau) |
| POST | `/api/automation-rules/:id/run` | Exécution manuelle d'une règle |

---

## Helpers utils.js

```js
parseDuree(str)               // "2h30" → 2.5 | "1h" → 1 | "30min" → 0.5
formatDuree(n)                // 2.5 → "2h30" | 1 → "1h"
formatDateShort(d)            // "2025-11-03" → "3 nov. 2025"
generateAutoTasks(form, cycle) // génère les tâches checklist pour une action
isPastDate(d)                 // true si date < aujourd'hui
isTaskEffectivelyDone(t)      // true si terminé ou tous assignés validés
```
