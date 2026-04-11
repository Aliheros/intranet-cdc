# CLAUDE.md — Intranet CDC (Cité des Chances)

Index principal. Lire ce fichier en début de session, puis les fichiers `docs/` selon le besoin.
Mise à jour : 2026-04-11

---

## Fichiers de référence

| Fichier | Contenu |
|---|---|
| `docs/CLAUDE-data.md` | Tous les modèles Prisma, formats, statuts, conventions |
| `docs/CLAUDE-pages.md` | Fonctionnalités détaillées par page |
| `docs/CLAUDE-systemes.md` | GeoSearch, heures bénévoles, automatisation, routes API, helpers |

---

## Stack & démarrage

| Couche | Tech |
|---|---|
| Frontend | React 18, Vite, CSS variables (thème clair/sombre) |
| Backend | Node.js / Express 5 |
| ORM | Prisma 5 |
| Base de données | PostgreSQL (Docker, port **5433**) |
| Auth | JWT access token en mémoire + refresh token cookie httpOnly |

```bash
docker-compose up -d           # PostgreSQL port 5433
cd backend && node src/server.js
cd frontend && npm run dev
```

`.env` backend : `DATABASE_URL="postgresql://intranet:intranet_dev@localhost:5433/intranet_db"`

**Après un changement de schéma Prisma :**
```bash
taskkill //F //IM node.exe     # libérer le verrou DLL Windows
npx prisma db push             # sync DB + regenerate client
```

---

## Architecture frontend (résumé)

```
src/
  api/apiClient.js          — fetch wrapper + refresh token auto
  contexts/
    AppContext.jsx           — UI global (modales, toasts, navigation)
    AuthContext.jsx          — currentUser, JWT, login/logout
    DataContext.jsx          — données métier + analyticsStats (useMemo)
  pages/                    — Dashboard, ActionTracker, Coordination,
                              Planning, SpaceView, Analytics, Admin
  components/modals/        — ActionModal, WizardModal, EventModal…
  components/admin/         — NdfConfigPanel, DfConfigPanel, AutomationPanel
  utils/utils.js            — parseDuree, formatDuree, generateAutoTasks…
  data/constants.js         — POLES, PROJETS, TYPES_ACTION, NIVEAUX_CLASSE…
```

---

## Pièges critiques à ne jamais oublier

1. **`pickActionFields` (backend `routes/actions.js`)** : tout nouveau champ du modèle Action DOIT y être ajouté (`'field' in body`), sinon il n'est jamais persisté en DB.

2. **GeoSearch dropdown** : `position: fixed` + `getBoundingClientRect()` obligatoire — sinon coupé par `overflow:auto` de la modale. Département toujours `readOnly`.

3. **SpaceView hooks** : tous les `useState` au niveau du composant racine, jamais dans des IIFEs ou conditions. Préfixer par onglet (`rhmX`, etc.).

4. **Cycle dans WizardModal** : JAMAIS de sélecteur de cycle — cycle = `cycles[0]` automatiquement.

5. **fetchSeancePresences** : après toute validation (resp ou RH), re-fetch complet depuis la DB. Ne jamais patcher l'état local.

6. **Events self-service** : envoyer UNIQUEMENT `{ equipe }` ou `{ equipe, seances }` depuis un membre standard — jamais le body complet (→ 403).

7. **apiClient erreurs** : `err.message` (pas `err.response?.data?.error` — ce n'est pas Axios).

8. **DEPT_NAMES** : défini localement dans `ActionModal.jsx` et `WizardModal.jsx`. À dupliquer si un nouveau composant en a besoin, ou extraire dans `utils.js`.

9. **Prisma generate sur Windows** : tuer node.exe avant (`taskkill //F //IM node.exe`) pour libérer le verrou DLL.

10. **Auteur automatisation** : les TaskRequests créées par le cron ont `requestedBy: "automatique"`. Intentionnel — à corriger si besoin de traçabilité nominative.

11. **Arrondissement** : sélecteur visible si `codesPostaux.length > 1` OU si `form.arrondissement` déjà renseigné (mode édition). Réinitialisé à `''` au changement de ville.

12. **NDF config** : Admin uniquement. Le bouton config a été retiré de `NoteFrais.jsx`.

13. **responsables[] ⊆ equipe[]** : validé backend ET frontend. On ne peut être responsable sans être membre. `responsableNom` doit être dans `responsables[]`.

14. **Boutons archive/modifier/supprimer Coordination** : icônes 32×32px avec `title`, pas de texte.

15. **generate SeancePresence idempotent** : `upsert update:{}` — appelable autant de fois que nécessaire, ne réinitialise jamais les validations existantes.
