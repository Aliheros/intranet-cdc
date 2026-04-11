# CLAUDE-data.md — Modèles de données & conventions

## Modèles Prisma (PostgreSQL)

### User
```
id, nom, prenom, avatar, pole, email, role, passwordHash
statut: "Actif" | "Congé" | "Inactif"
dateInscription, conges[], isDeleted
```

### Action
```
id, etablissement, ville, departement, arrondissement, labelRep, institutionSimulee
adresse            — texte libre optionnel (ex: "15 rue de la Paix")
arrondissement     — code postal (ex: "75018") — Paris/Lyon/Marseille uniquement
type, type_classe, statut, cycle
date_debut, date_fin
responsables[]     (noms, pas IDs)
polesNotifies[], projet
beneficiaires (Int), bilan (JSON stringifié)
notes, isArchived, timeline[], completionScore, checklist (JSON)
budgetPrevisionnel, depensesReelles, transactionId
```
> `heures` : supprimé du formulaire — heures bénévoles uniquement via SeancePresence.
> `pickActionFields` (backend) : tout nouveau champ Action DOIT y être ajouté pour être persisté.

### Evenement
```
id, titre, date, cycle, lieu, statut, isArchived
actionId (nullable)
equipe[]         — tous membres (noms)
responsables[]   — gestionnaires ⊆ equipe
responsableNom   — UN responsable pour valider les présences (doit être dans equipe)
poles[], projet, whatsappLink
seances[]        — JSON array de Seance
fichiers[]
```
Cascade : quitter equipe → retiré de responsables[] + responsableNom effacé si nécessaire.

### Seance (sous-objet JSON dans Evenement.seances)
```
id              — Date.now() à la création, stable ensuite
date, heure, libelle
duree           — Float (ex: 2.5 = "2h30")
inscrits[]      — noms (doivent être dans equipe)
bilan, annulee, raisonAnnulation, commentaireAnnulation
fichiers[]
```

### SeancePresence
```
id, evenementId, evenementTitre
seanceId (String), seanceDate (String "YYYY-MM-DD")
membreNom, heures (Float)
resp1Statut: "en_attente" | "present" | "absent"
resp1Par, resp1At
rhStatut: "en_attente" | "confirme" | "rejete"
rhPar, rhAt
hourId (nullable — Hour créé à confirmation RH)
@@unique([evenementId, seanceId, membreNom])
```

### Hour
```
id, userId (nullable), userNomSnapshot
eventId, type, hours (Float), date, status: "Validé"
```

### Task
```
id, text, space, deadline, status, actionId
assignees[]: { name, completed }
createdBy, lockedBy?, forceCompletedBy?
cycle
```

### TaskRequest
```
id, text, description?, space, actionId?
requestedBy     — nom ou "automatique"
assignees[], targetPool[], deadline?, cycle
status: "pending" | "accepted" | "refused"
```

### NoteFrais
```
id, numeroDossier (unique), demandeurId, demandeurNom
date, categorie, montant, description
justificatif?, projet?, pole?, linkedActionId?
statut, commentaireTresorerie?, transactionId?
historique[], suppressionDemandee
```

### Transaction
```
id, date, libelle, type: "Dépense"|"Recette"
montant, imputation (pôle/projet), statut
fichiers[], categorie?, createdBy?
horseBudget, horseBudgetRaison?, horseBudgetApprovedBy?
devisFactureId?
```

### DevisFacture
```
id, titre, type: "Devis"|"Facture", statut
montant, emetteur, destinataire, categorie?
statut: "Brouillon"|"Soumis"|"En traitement"|"Modif. demandée"|"Signé"|"Refusé"
fichiers[], commentaires[], historique[]
signataire?, signedAt?, motifRefus?
transactionId?, createdBy, createdById?
```

### AutomationRule
```
id, nom, description?
isActive (Boolean, default true)
triggerOffsetDays (Int)    — jours AVANT la date de référence (ex: 7 = J-7)
triggerDateRef (String)    — "date_debut" | "date_fin"
actionTypeFilter (String[]) — vide = toutes les actions
targetPole (String)
taskText, taskDescription?
createdBy
executions: AutomationExecution[]
```

### AutomationExecution
```
id, ruleId, actionId, taskRequestId?, firedAt
@@unique([ruleId, actionId])   — une règle = une fois par action
```
> Auteur des TaskRequests auto : `"automatique"` — à corriger si besoin de traçabilité nominative.

### ImpactStudy
```
id, cycle, typeAction
nbBeneficiaires, nbAteliers, nbEtablissements
heuresAccompagnement, heureMoyParBenef, nbBenevoles
notes, createdBy
```

### AuditLog (append-only, jamais UPDATE/DELETE)
```
id, actorId?, actorNom, action, targetId?, targetType, targetNom?, payload?, ip
```

---

## Formats & conventions

| Donnée | Stockage | Affichage |
|---|---|---|
| Durée séance | `Float` (2.5) | `formatDuree(2.5)` → `"2h30"` |
| Saisie durée | texte `"2h30"` | `parseDuree("2h30")` → `2.5` |
| Département | `String` `"93"` | `"93 — Seine-Saint-Denis"` via `DEPT_NAMES` |
| Arrondissement | `String` `"75018"` | code postal brut |
| Bilan action | `String` JSON.stringify | parsé à la lecture |
| Seance.id | `Date.now()` | stable, jamais regénéré |
| SeancePresence.seanceId | `String(s.id)` | comparé avec `String(s.id)` |

**Cycles** : `"2025-2026"` · `cycles[0]` = actif · jamais exposé dans WizardModal.

**Rôles système** : `Admin` > `Bureau` > Responsable espace > membre standard

**Rôles événement** : `responsables[]` ⊆ `equipe[]` > visiteurs

---

## Statuts

| Entité | Statuts |
|---|---|
| Action | `Planifiée` · `En cours` · `Terminée` · `Annulée` |
| NDF | `Brouillon` → `Soumise` → `En vérification` → `Validée` → `Remboursée` (ou `Refusée`) |
| SeancePresence resp | `en_attente` → `present` \| `absent` |
| SeancePresence RH | `en_attente` → `confirme` \| `rejete` |
| DevisFacture | `Brouillon` → `Soumis` → `En traitement` → `Modif. demandée` → `Signé` \| `Refusé` |
| TaskRequest | `pending` → `accepted` \| `refused` |
