# Styles — Organisation Modulaire

Ce dossier contient toutes les feuilles de style CSS de l'Intranet CDC, organisées de manière modulaire pour une meilleure maintenabilité.

## Structure

```
styles/
├── base/                    # Styles de base (variables, animations, layout)
│   ├── variables.css        # Variables CSS (thèmes clair/sombre, polices)
│   ├── animations.css       # Toutes les keyframes de l'application
│   └── layout.css           # Structure, responsive, sidebar, utilitaires
│
├── components/              # Composants UI réutilisables
│   ├── buttons.css          # Boutons (primary, secondary, danger, etc.)
│   ├── forms.css            # Champs de formulaire et labels
│   ├── cards.css            # Cartes (KPI, événements, espace, etc.)
│   ├── modals.css           # Fenêtres modales
│   ├── navigation.css       # Sidebar et navigation
│   ├── tables.css           # Tableaux de données
│   ├── overlays.css         # Bannières, toasts, notifications, tutorial
│   └── utilities.css        # Progress bars, badges, avatars, utilitaires
│
├── themes/                  # Thèmes spécifiques à un contexte
│   ├── themes.css           # Fichier réservé aux thèmes additionnels
│   ├── glass.css            # Thème glass morphism (Dashboard, etc.)
│   └── space-themes.css     # Thèmes Espace Pôle/Projet
│
├── login-loader.css         # Animations spécifiques au loader de connexion
└── README.md                # Ce fichier
```

## Ordre d'import (dans index.css)

1. **Polices** — Google Fonts (Poppins, Inter)
2. **Base** — Variables → Animations → Layout
3. **Composants** — Buttons → Forms → Cards → Modals → Navigation → Tables → Overlays → Utilities
4. **Thèmes** — themes.css → glass.css → space-themes.css

Cet ordre est important car les styles sont de plus en plus spécifiques.

## Comment ajouter de nouveaux styles

### 1. Nouvelle variable CSS
→ Ajouter dans `base/variables.css`

### 2. Nouvelle animation
→ Ajouter dans `base/animations.css`

### 3. Nouveau composant UI générique
→ Créer un fichier dans `components/` (ex: `tooltips.css`)
→ Ajouter l'import dans `index.css`

### 4. Nouveau thème de page
→ Créer un fichier dans `themes/` (ex: `reports-theme.css`)
→ Ajouter l'import dans `index.css` après les autres thèmes

### 5. Style spécifique à une page unique
→ Si c'est très spécifique (ex: loader de connexion), laisser à la racine de `styles/`
→ Sinon, créer un fichier dans `themes/`

## Bonnes pratiques

- **Ne pas modifier** l'ordre des imports dans `index.css`
- **Toujours tester** l'application après avoir modifié un fichier de style
- **Documenter** les nouvelles classes CSS avec des commentaires
- **Utiliser les variables** CSS plutôt que des valeurs en dur
- **Respecter la nomenclature** existante (ex: `.kc` pour KPI card, `.sc` pour standard card)

## Conventions de nommage

- `.kc` — KPI Card
- `.sc` — Standard Card
- `.cbox` — Container Box
- `.btn-*` — Boutons
- `.form-*` — Champs de formulaire
- `.*-gradient` — Thèmes de fond (glass, europe, coord, etc.)

## Thèmes disponibles

### Glass Morphism (`glass.css`)
Applique un effet de verre dépoli sur les cartes et fonds. Utilisé principalement sur le Dashboard.

### Espace Pôle/Projet (`space-themes.css`)
Styles spécifiques aux pages Pôle et Projet, avec des variations comme :
- `europe-gradient` — Thème bleu/or inspiré de l'UE
- `coord-gradient` — Thème indigo/violet pour la Coordination

## Dépannage

Si un style ne s'applique pas :
1. Vérifier que le fichier est bien importé dans `index.css`
2. Vérifier l'ordre des imports (les thèmes doivent être après les composants)
3. Vérifier la spécificité CSS (les thèmes écrasent les composants)
4. Inspecter l'élément dans le navigateur pour voir quels styles s'appliquent