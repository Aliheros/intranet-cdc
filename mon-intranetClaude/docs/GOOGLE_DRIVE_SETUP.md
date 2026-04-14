# Export automatique Google Drive — Guide de configuration

Ce document explique comment configurer et utiliser le système d'export automatique de l'intranet vers Google Drive.

---

## Vue d'ensemble

Le système exporte automatiquement **toutes les données** de l'intranet vers un dossier Google Drive une fois par jour. Il couvre :

- **20 types de données** (utilisateurs, actions, événements, finances, heures, etc.)
- **Les fichiers uploadés** (PDFs, images, documents) — miroir incrémental
- **Format configurable** par type (CSV ou JSON)
- **Interface admin** pour configurer, tester et consulter l'historique

### Structure des dossiers générés sur Drive

```
Intranet CDC/                        ← dossier racine (vous le créez)
  2026/
    04/
      13/
        utilisateurs_2026-04-13.csv
        actions_2026-04-13.csv
        evenements_2026-04-13.csv
        seance-presences_2026-04-13.csv
        transactions_2026-04-13.csv
        notes-frais_2026-04-13.csv
        devis-factures_2026-04-13.csv
        heures-benevoles_2026-04-13.csv
        missions_2026-04-13.csv
        impact-studies_2026-04-13.csv
        contacts_2026-04-13.csv
        audit-logs_2026-04-13.json
        tasks_2026-04-13.csv
        task-requests_2026-04-13.csv
        budgets_2026-04-13.csv
        faq_2026-04-13.csv
        dashboard-messages_2026-04-13.csv
        app-config_2026-04-13.json
        automation-rules_2026-04-13.csv
        notifications_2026-04-13.csv
  uploads/                           ← miroir permanent des fichiers uploadés
    avatar_1.jpg
    1718000000000-abc123.pdf
    ...
```

---

## Étape 1 — Créer un Service Account Google

Un **Service Account** est un compte technique qui permet au serveur d'accéder à Drive sans interaction humaine (pas de fenêtre de connexion).

1. Aller sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créer un projet (ou utiliser un existant)
3. Activer l'**API Google Drive** : Menu → APIs & Services → Library → rechercher "Google Drive API" → Activer
4. Créer un Service Account :
   - Menu → IAM & Admin → Service Accounts → Créer un compte de service
   - Nom : `intranet-cdc-export` (ou similaire)
   - Ignorer les étapes "rôles" et "utilisateurs" (pas nécessaires pour Drive)
5. Générer une clé JSON :
   - Cliquer sur le Service Account créé → onglet "Clés" → Ajouter une clé → JSON
   - Le fichier est téléchargé automatiquement — **ne jamais le commiter dans git**

---

## Étape 2 — Préparer le dossier Google Drive

1. Dans Google Drive, créer un dossier (ex : `Intranet CDC`)
2. Faire un clic droit → Partager → coller l'**email du Service Account** (visible dans Google Cloud Console, format `nom@projet.iam.gserviceaccount.com`) → lui donner le rôle **Éditeur**
3. Copier l'**ID du dossier** depuis l'URL :
   ```
   https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz
                                           ↑ c'est cet ID
   ```

---

## Étape 3 — Configurer le backend

### Placer le fichier de clé

En production, placer le fichier JSON hors du dépôt git :
```bash
# Exemple sous Linux / Docker
mkdir -p /etc/secrets
cp google-service-account.json /etc/secrets/google-service-account.json
chmod 600 /etc/secrets/google-service-account.json
```

En développement local, le placer n'importe où hors du dossier du dépôt :
```bash
cp ~/Downloads/mon-projet-xxxxx.json ~/google-service-account.json
```

### Ajouter les variables d'environnement dans `.env`

```env
# Chemin absolu vers le fichier de clé JSON
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=/etc/secrets/google-service-account.json

# ID du dossier Drive partagé avec le Service Account
GOOGLE_DRIVE_ROOT_FOLDER_ID=1AbCdEfGhIjKlMnOpQrStUvWxYz

# Planification (optionnel, défaut : tous les jours à 07:00)
DRIVE_EXPORT_CRON=0 7 * * *
```

---

## Étape 4 — Activer dans l'interface Admin

1. Se connecter en tant qu'**Admin**
2. Aller dans **Admin → Sauvegarde Drive**
3. Coller le **Folder ID** dans le champ correspondant
4. Activer le toggle **"Export activé"**
5. Ajuster le planning si nécessaire (défaut : 07:00 chaque jour)
6. Cliquer **Enregistrer**
7. Cliquer **Lancer l'export maintenant** pour tester

---

## Configuration disponible

Tout est configurable depuis **Admin → Sauvegarde Drive** ou directement via la clé `google_drive_export` dans AppConfig.

| Paramètre | Description | Défaut |
|---|---|---|
| `enabled` | Activer/désactiver l'export automatique | `false` |
| `schedule` | Expression cron du déclenchement | `0 7 * * *` (07:00) |
| `format` | Format global : `csv` ou `json` | `csv` |
| `rootFolderId` | ID du dossier Drive racine | `` (requis) |
| `syncFiles` | Synchroniser aussi les fichiers uploadés | `true` |
| `notifyUsers` | Noms des admins à notifier en cas d'échec | `[]` |
| `activeExporters` | Liste des exporteurs à exécuter (vide = tous) | tous les 20 |
| `formatOverrides` | Format spécifique par exporteur | `{appConfig: 'json', auditLogs: 'json'}` |

---

## Types de données exportées

| Exporteur | Modèle | Format par défaut | Contenu |
|---|---|---|---|
| `users` | User | CSV | Profils complets (sans mot de passe) |
| `actions` | Action | CSV | Actions terrain avec budget et timeline |
| `evenements` | Evenement | CSV | Événements et séances |
| `seancePresences` | SeancePresence | CSV | Présences et validations |
| `transactions` | Transaction | CSV | Recettes et dépenses |
| `notesFrais` | NoteFrais | CSV | Notes de frais |
| `devisFactures` | DevisFacture | CSV | Devis et factures |
| `heures` | Hour | CSV | Heures bénévoles validées |
| `missions` | Mission | CSV | Missions et candidatures |
| `impactStudies` | ImpactStudy | CSV | Métriques d'impact par cycle |
| `contacts` | Contact | CSV | Contacts externes |
| `auditLogs` | AuditLog | **JSON** | Journal d'audit complet |
| `tasks` | Task | CSV | Tâches par espace |
| `taskRequests` | TaskRequest | CSV | Demandes de tâches automatisées |
| `budgets` | Budget | CSV | Budgets par pôle |
| `faq` | Faq | CSV | Base de connaissances |
| `dashboardMessages` | DashboardMessage | CSV | Messages rotatifs |
| `appConfig` | AppConfig | **JSON** | Listes de référence configurables |
| `automationRules` | AutomationRule | CSV | Règles d'automatisation |
| `notifications` | Notification | CSV | Notifications envoyées |

Les fichiers **uploadés** (PDFs, images, documents) sont synchronisés séparément dans `uploads/`.

---

## Format des fichiers CSV

- Encodage **UTF-8 avec BOM** (compatible Excel, LibreOffice, Google Sheets)
- Séparateur **virgule**, valeurs entre guillemets
- Les champs JSON imbriqués (ex : `checklist`, `historique`) sont sérialisés en string dans la colonne correspondante
- Première ligne : en-têtes en français

---

## Ajouter un nouvel exporteur (pour les développeurs)

Quand une nouvelle section est ajoutée à l'intranet, l'exporter en **3 étapes** :

### Étape 1 — Créer le fichier exporteur

```js
// backend/src/exports/exporters/monNouveauModele.js
const { registerExporter } = require('../index');
const { toCSV, toJSON } = require('../utils/csvFormatter');

registerExporter({
  key: 'monNouveauModele',          // identifiant unique
  label: 'Mon Nouveau Modèle',      // affiché dans l'UI admin
  defaultFormat: 'csv',             // 'csv' | 'json'
  fileName: (date, fmt) => `mon-nouveau-modele_${date}.${fmt}`,

  async run(prisma, format) {
    const rows = await prisma.monNouveauModele.findMany({
      orderBy: { createdAt: 'desc' },
    });

    if (format === 'json') return toJSON(rows);

    const data = rows.map(r => ({
      ID: r.id,
      Champ1: r.champ1 || '',
      // Champs JSON → sérialiser en string
      'Données JSON': JSON.stringify(r.donneesJson || {}),
      'Créé le': r.createdAt?.toISOString().slice(0, 10) || '',
    }));

    const headers = ['ID', 'Champ1', 'Données JSON', 'Créé le'];
    return Buffer.from(toCSV(data, headers), 'utf8');
  },
});
```

### Étape 2 — Ajouter à la configuration par défaut

Dans `backend/src/lib/seedAppConfig.js`, dans le tableau `activeExporters` de `google_drive_export` :
```js
activeExporters: [
  // ... exporteurs existants ...
  'monNouveauModele',  // ← ajouter ici
],
```

### Étape 3 — L'auto-loader fait le reste

Au prochain démarrage du serveur, l'exporteur apparaît automatiquement dans :
- L'UI Admin → Sauvegarde Drive (checklist des exporteurs)
- Les runs automatiques et manuels

Aucune autre modification n'est nécessaire.

---

## Architecture technique

```
backend/src/
  exports/
    index.js                ← Registre + auto-loader (pattern registre)
    exporters/              ← 20 fichiers indépendants, 1 par modèle
    utils/
      csvFormatter.js       ← toCSV(), toJSON(), flattenJson()
  lib/
    driveClient.js          ← Auth Service Account, ensureFolder(), uploadFile()
    driveExportCron.js      ← Orchestrateur + cron node-cron
    fileSyncer.js           ← Miroir incrémental uploads/ → Drive

frontend/src/components/admin/
  DriveExportPanel.jsx      ← Interface de configuration
```

### Dépendances ajoutées

```json
"googleapis": "^144.0.0",   // Client officiel Google APIs
"mime": "^3.0.0"            // Détection type MIME pour sync fichiers
```

### Variables d'environnement

| Variable | Obligatoire | Description |
|---|---|---|
| `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` | Oui (si activé) | Chemin absolu vers le fichier JSON de clé |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | Non | ID du dossier Drive (peut aussi être dans AppConfig) |
| `DRIVE_EXPORT_CRON` | Non | Expression cron (défaut : `0 7 * * *`) |

---

## Résolution des problèmes

| Problème | Cause probable | Solution |
|---|---|---|
| `GOOGLE_SERVICE_ACCOUNT_KEY_PATH non défini` | Variable manquante dans `.env` | Ajouter la variable avec le chemin du fichier JSON |
| `Fichier de clé introuvable` | Chemin incorrect ou fichier absent | Vérifier que le fichier existe au chemin indiqué |
| `403 Forbidden` depuis Drive | Service Account sans accès au dossier | Partager le dossier Drive avec l'email du Service Account (Éditeur) |
| `rootFolderId non configuré` | Folder ID absent | Renseigner le Folder ID dans Admin → Sauvegarde Drive |
| Export partiel (certains exporteurs en échec) | Erreur DB sur un modèle | Consulter les logs backend et l'historique dans l'UI Admin |
| Fichiers uploadés non synchronisés | `syncFiles: false` | Activer "Synchroniser les fichiers uploadés" dans la config |

---

## Sécurité

- Le fichier de clé Service Account ne doit **jamais** être commité dans git (`.gitignore` le protège s'il est dans `/backend`)
- Scope utilisé : `https://www.googleapis.com/auth/drive.file` — l'app ne voit que les fichiers qu'elle a créés
- La configuration est modifiable uniquement par les rôles Admin et Bureau
- Chaque export est tracé dans le journal d'audit (`export.drive.run`)
