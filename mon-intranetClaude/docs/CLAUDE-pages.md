# CLAUDE-pages.md — Fonctionnalités par page

## Dashboard
- KPIs cycle en cours, alertes, dernières actions/tâches
- **Alerte présences** : si `responsableNom === currentUser` sur un événement et qu'une séance passée a des présences `en_attente` → KPI card orange + bloc alerte avec lien vers Coordination (calculé client-side depuis `seancePresences` + `evenements`)

---

## ActionTracker — Suivi des actions

**Création** via `WizardModal` (4 étapes) :
- Étape 1 — Identification : type, établissement, GeoSearch, labelRep, contacts, projet
- Étape 2 — Équipe & Dates : responsables, dates, notes
- Étape 3 — Impact & Budget : bénéficiaires, type_classe, budgetPrevisionnel, polesNotifies
- Étape 4 — Automatisation : tâches auto-générées (éditables), récapitulatif

**Modification** via `ActionModal` (mêmes champs + NDF liées + checklist)

**Champs géographiques** :
- `ville` : GeoSearch (API `geo.api.gouv.fr`) — recherche par nom ou CP
- `departement` : auto-rempli, **toujours readOnly**, affiché `"93 — Seine-Saint-Denis"` via `DEPT_NAMES`
- `arrondissement` : `<select>` visible si `codesPostaux.length > 1` (Paris, Lyon, Marseille). Stocke CP ex `"75018"`. En édition, reste visible si déjà renseigné.
- `adresse` : texte libre optionnel
- `labelRep` : Hors REP / REP / REP+
- `institutionSimulee` : visible uniquement si type contient "Simulation" ou "COP"

**Permissions** :
- `canEdit = isAdmin || nom dans responsables[]`
- Non-canEdit : voit barres de progression, dates, checklist (lecture seule), liens espace tâche si `canView` sur l'espace
- Boutons Modifier/Archiver/Supprimer : cachés si non-canEdit
- Auto-inscription aux responsables : tout authentifié peut s'ajouter/retirer de `responsables[]` uniquement

---

## Coordination — Événements & Séances

**EventModal** — deux onglets :
- **Événement** : titre, date/lieu, statut, action liée, projet, pôles, équipe (Shield = promouvoir responsable), sélecteur responsableNom
- **Séances** : ajout + liste éditable (tous champs éditables, y compris date/heure)

**Vue détail** :
- Métadonnées compactes, équipe avec badges, Shield vert sur responsableNom
- Responsables visibles par tous ; ajout/retrait conditionné à `canEditEvent`
- Sélecteur responsableNom : uniquement parmi `responsables[]`

**Permissions** :
- `canManageEvent = isAdmin || isResponsable || isActionResponsable || isEventResponsable`
- `canEditEvent = canManageEvent && !isArchived`
- Membre standard : rejoindre/quitter équipe, s'inscrire/désinscrire séances uniquement

**Backend self-service (PUT /events/:id)** :
- Non-responsable : seuls `equipe` et `seances` acceptés — **ne jamais envoyer le body complet**
- `joinEventTeam` → `{ equipe }` · `removeEventTeamMember` → `{ equipe, seances }`

**Validation présences** :
- "Générer les fiches" → `POST /api/seance-presences/generate` (idempotent)
- Boutons Présent/Absent par membre inscrit (visible uniquement pour responsableNom)
- "Corriger" dispo après première validation · Badge "✓ Complète" quand tout validé

---

## Planning — Calendrier
- 4 vues : Mois, Semaine, Agenda, Timeline
- Items : Action, Événement standalone, Séance, Tâche
- Fusion Action + Événement lié : rendu bicolore
- Filtres par type, par membre ("Mon agenda")
- Panel alertes J-1 au-dessus du calendrier

---

## SpaceView — Espaces Pôles & Projets
- Un espace par pôle + par projet (`POLES` + `PROJETS`)

**Onglets** :
| Onglet | Disponibilité |
|---|---|
| `docs` | tous |
| `chat` | tous |
| `tasks` | tous |
| `ndf` | tous (config dans Admin uniquement) |
| `rh_suivi` | pôle RH — validation heures bénévoles |
| `rh_missions` | pôle RH — missions + candidatures |
| `tresorerie` | pôle Trésorerie — transactions, budgets, devis/factures |

**Validation RH heures** (`rh_suivi`) :
- Liste SeancePresence avec `resp1Statut ≠ en_attente` et `rhStatut = en_attente`
- Confirmer → crée Hour `{ type:"Animation", status:"Validé" }`
- Rejeter → supprime Hour si hourId existe
- Historique 20 dernières validations

**Règle hooks SpaceView** : tous les `useState` au niveau du composant principal, jamais dans des IIFEs. Préfixes par onglet (`rhmX` pour `rh_missions`, etc.).

---

## Analytics — Tableau de bord
- Sélecteur de cycle en haut (+ "Tous cycles")

**Alertes intelligentes** (badge sur onglet) :
- Annulation séances ≥ 25%
- Budget pôle ≥ 80% / dépassement
- Bénévole avec 6+ tâches (`overloadedMembers`)
- 5+ NDF en attente
- Actions en retard sur date de fin

**Onglets** :
| Onglet | Contenu clé |
|---|---|
| Vue d'ensemble | Statuts actions, bénéficiaires/mois, velocity complétion, heures par type |
| Actions | Satisfaction bilan, top actions, par pôle/type/niveau/labelRep/département/institution |
| Bénévoles | Top 10 heures, charge tâches, `overloadedMembers` |
| Finances | Budget alloué vs dépensé par pôle, NDF par catégorie |
| Rapport | Rapport d'impact auto + ImpactStudy manuelles (CRUD) |

---

## Admin
**Onglets** : Utilisateurs & permissions · Audit · Paramètres · Exports · Statistiques

**Paramètres > sous-onglets** :
| Sous-onglet | Contenu |
|---|---|
| Notes de Frais | Catégories, plafonds, délais, instructions (seul endroit pour configurer les NDF) |
| Devis & Factures | Catégories DF |
| Cycles / Années | Création / suppression de cycles |
| Automatisation | CRUD `AutomationRule` — voir `CLAUDE-systemes.md` |
