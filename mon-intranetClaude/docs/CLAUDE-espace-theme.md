# Guide — Thème visuel par espace (pôle / projet)

Mise à jour : 2026-04-12  
Référence implémentée : **Projet Europe**

Ce document explique le système de thématisation par espace et donne toutes les valeurs à personnaliser pour en créer un nouveau.

---

## Architecture du système

Le style d'un espace repose sur **3 couches** :

| Couche | Fichier | Rôle |
|---|---|---|
| Classe CSS racine | `glass.css` | Variables de couleur, fond, cartes, boutons |
| Classe header | `glass.css` | Gradient animé + shimmer du bandeau titre |
| Classe tab bar | `glass.css` | Fond de la barre de sous-onglets sticky |
| Activation | `Layout.jsx` | Ajout conditionnel des classes sur `<main>` |
| JSX conditionnel | `SpaceView.jsx` | Header, tab bar, classes sur les boutons inline |

---

## Étape 1 — Activer le fond gradient dans Layout.jsx

**Fichier :** `frontend/src/components/layout/Layout.jsx`

Deux endroits à modifier (lignes ~386-387 et ~575) :

```jsx
// Ligne ~386 — ajouter la condition pour le nouvel espace
<main className={`main
  ${page === 'dashboard' ? 'main-gradient' : ''}
  ${(page === 'projet' && subPage === 'Europe') ? ' europe-gradient' : ''}
  ${(page === 'pole'   && subPage === 'NOM_POLE') ? ' nom-pole-gradient' : ''}
  ${freshLogin ? ' login-transition' : ''}
`}>

// Ligne ~387 — rendre le gradient-layer pour cet espace
{(page === 'dashboard'
  || (page === 'projet' && subPage === 'Europe')
  || (page === 'pole'   && subPage === 'NOM_POLE')
) && <div className="gradient-layer" aria-hidden="true" />}

// Ligne ~575 — wrapper gradient-content (z-index au-dessus du fond)
<div className={(
  page === 'dashboard'
  || (page === 'projet' && subPage === 'Europe')
  || (page === 'pole'   && subPage === 'NOM_POLE')
) ? 'gradient-content' : ''}
  style={(
    page !== 'dashboard'
    && !(page === 'projet' && subPage === 'Europe')
    && !(page === 'pole'   && subPage === 'NOM_POLE')
  ) ? { padding: '28px 44px 44px' } : undefined}>
```

---

## Étape 2 — Activer header et tab bar dans SpaceView.jsx

**Fichier :** `frontend/src/pages/SpaceView.jsx`

### Header (bandeau titre)

```jsx
// Ligne ~347 — retirer le background inline pour l'espace thématisé
<div
  className={subPage === 'NOM_ESPACE' ? 'nom-espace-space-header' : ''}
  style={{
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 44px',
    margin: '-28px -44px 0',
    background: subPage === 'NOM_ESPACE' ? undefined : (color || 'var(--accent)'),
  }}>
```

### Barre de sous-onglets

```jsx
// Ligne ~385 — classe conditionnelle + retirer les styles inline pour cet espace
<div
  className={subPage === 'NOM_ESPACE' ? 'nom-espace-tab-bar' : ''}
  style={{
    position: 'sticky', top: 62, zIndex: 40,
    display: 'flex', alignItems: 'center', gap: 2,
    margin: '0 -44px', padding: '0 44px',
    background: subPage === 'NOM_ESPACE' ? undefined : 'rgba(255,255,255,0.72)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    borderBottom: subPage === 'NOM_ESPACE' ? undefined : '1px solid rgba(0,0,0,0.07)',
    marginBottom: 24,
  }}>
```

### Boutons inline sémantiques

Ces boutons ont des styles inline — leur donner une classe permet de les cibler depuis CSS :

```jsx
// Bouton action bleue (ex : lien vers une action)
<button className="eu-chip-blue" style={{ ... }}>

// Bouton refus / suppression
<button className="eu-chip-danger" style={{ ... }}>

// Bouton restauration / succès
<button className="eu-chip-success" style={{ ... }}>
```

> Ces classes `.eu-chip-*` peuvent être réutilisées sur plusieurs espaces car leur style est  
> conditionné par `.europe-gradient` parent — elles n'ont aucun effet hors de cet espace.  
> Pour un autre espace, créer `.nom-espace-chip-*` de la même façon.

---

## Étape 3 — Créer le bloc CSS dans glass.css

Copier le template ci-dessous et remplacer toutes les valeurs entre `< >`.

```css
/* ═══════════════════════════════════════════════════════════════════════════
   NOM_ESPACE — Identité visuelle
   Palette : <couleur principale> + <couleur accent> + <couleur sombre>
   Fond clair : <description>   |   Fond sombre : <description>
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── 1. Fond de page + variables de texte ───────────────────────────────── */
/*
   PRINCIPE : redéfinir les variables CSS sur .xxx-gradient les propage
   automatiquement à TOUS les enfants — y compris les style={{ color: "var(--text-muted)" }}
   inline dans le JSX. Pas besoin de toucher chaque composant.
*/
.nom-espace-gradient {
  background-color: <COULEUR_FOND_CLAIR> !important;  /* ex: #e8eeff */
  background-image: none !important;
  position: relative;

  /* Texte — remplacer les gris neutres par des teintes de la palette */
  --text-base:    <COULEUR_TEXTE_PRINCIPAL>;    /* ex: #0b1d45 — très lisible sur fond clair */
  --text-dim:     <COULEUR_TEXTE_SECONDAIRE>;   /* ex: #2c4d96 — remplace #64748b */
  --text-muted:   <COULEUR_TEXTE_DISCRET>;      /* ex: #4a6cb8 — remplace #94a3b8 */

  /* Surfaces & bordures */
  --bg-surface:   <COULEUR_SURFACE>;            /* ex: rgba(240, 248, 255, 0.82) */
  --bg-alt:       <COULEUR_ALT>;                /* ex: rgba(220, 235, 255, 0.55) */
  --bg-hover:     <COULEUR_HOVER>;              /* ex: rgba(210, 228, 255, 0.60) */
  --border-light: <COULEUR_BORDURE>;            /* ex: rgba(170, 205, 255, 0.50) */
}
.dark-theme .nom-espace-gradient {
  background-color: <COULEUR_FOND_SOMBRE> !important;  /* ex: #04091a */
  background-image: none !important;

  --text-base:    <COULEUR_TEXTE_PRINCIPAL_DARK>;  /* ex: #eef3ff */
  --text-dim:     <COULEUR_TEXTE_SECONDAIRE_DARK>; /* ex: #9db8e8 */
  --text-muted:   <COULEUR_TEXTE_DISCRET_DARK>;    /* ex: #6888c0 */

  --bg-surface:   <COULEUR_SURFACE_DARK>;          /* ex: rgba(8, 20, 55, 0.75) */
  --bg-alt:       <COULEUR_ALT_DARK>;              /* ex: rgba(12, 28, 70, 0.60) */
  --bg-hover:     <COULEUR_HOVER_DARK>;            /* ex: rgba(15, 35, 85, 0.65) */
  --border-light: <COULEUR_BORDURE_DARK>;          /* ex: rgba(80, 120, 220, 0.18) */
}

/* ── 2. Gradient layer — halos animés de fond ───────────────────────────── */
/*
   5 halos radiaux dont les positions dérivent via gradientDrift (45s).
   Les positions --gx1/gy1..--gx4/gy4 sont des custom properties globales
   animées en CSS — pas de JS nécessaire pour les espaces (contrairement
   au Dashboard qui utilise un RAF + magnétisme souris).
   Ajuster les teintes HSL pour correspondre à la palette.
*/
.nom-espace-gradient .gradient-layer {
  background-color: <COULEUR_BASE_GRADIENT>;   /* ex: #dce8ff */
  background-image:
    radial-gradient(ellipse 72% 62% at var(--gx1) var(--gy1), hsla(<H>, <S>%, <L>%, .60) 0px, transparent 100%),
    radial-gradient(ellipse 52% 48% at var(--gx2) var(--gy2), hsla(<H>, <S>%, <L>%, .42) 0px, transparent 100%),
    radial-gradient(ellipse 66% 58% at var(--gx3) var(--gy3), hsla(<H>, <S>%, <L>%, .52) 0px, transparent 100%),
    radial-gradient(ellipse 48% 44% at var(--gx4) var(--gy4), hsla(<H>, <S>%, <L>%, .32) 0px, transparent 100%),
    radial-gradient(ellipse 82% 72% at 88% 88%,               hsla(<H>, <S>%, <L>%, .28) 0px, transparent 100%);
  animation: gradientDrift 45s ease-in-out infinite;
}
.dark-theme .nom-espace-gradient .gradient-layer {
  background-color: <COULEUR_BASE_GRADIENT_DARK>;
  background-image:
    radial-gradient(ellipse at var(--gx1) var(--gy1), hsla(<H>, <S>%, <L_DARK>%, .95) 0px, transparent 55%),
    radial-gradient(ellipse at var(--gx2) var(--gy2), hsla(<H>, <S>%, <L_DARK>%, .55) 0px, transparent 50%),
    radial-gradient(ellipse at var(--gx3) var(--gy3), hsla(<H>, <S>%, <L_DARK>%, .80) 0px, transparent 52%),
    radial-gradient(ellipse at var(--gx4) var(--gy4), hsla(<H>, <S>%, <L_DARK>%, .45) 0px, transparent 46%),
    radial-gradient(ellipse at 88% 88%,               hsla(<H>, <S>%, <L_DARK>%, .55) 0px, transparent 42%);
  animation: gradientDrift 45s ease-in-out infinite;
}

/* ── 3. Cartes glass (.kc et .sc) ───────────────────────────────────────── */
/*
   Bordure : éviter le blanc pur — utiliser une teinte de la couleur principale
   à faible opacité. L'inset box-shadow crée un reflet en haut de la carte.
*/
.nom-espace-gradient .kc,
.nom-espace-gradient .sc {
  background: rgba(255, 255, 255, .46) !important;
  backdrop-filter: blur(14px) saturate(145%);
  -webkit-backdrop-filter: blur(14px) saturate(145%);
  border: 1px solid <COULEUR_BORDURE_CARTE_CLAIR> !important;  /* ex: rgba(170, 205, 255, .45) */
  box-shadow: 0 20px 40px <OMBRE_CARTE_CLAIR>, inset 0 1px 0 rgba(255, 255, 255, .75);
  transform-style: preserve-3d;
  transition: box-shadow .3s ease, border-color .3s ease, transform .3s ease;
}
.nom-espace-gradient .kc:hover,
.nom-espace-gradient .sc:hover {
  box-shadow: 0 30px 60px <OMBRE_CARTE_CLAIR_HOVER>, inset 0 1px 0 rgba(255, 255, 255, .92);
  border-color: <COULEUR_BORDURE_CARTE_HOVER> !important;
}
.main.scrolling .nom-espace-gradient .kc,
.main.scrolling .nom-espace-gradient .sc {
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
.dark-theme .nom-espace-gradient .kc,
.dark-theme .nom-espace-gradient .sc {
  background: <FOND_CARTE_DARK> !important;              /* ex: rgba(4, 14, 40, .62) */
  border-color: <COULEUR_BORDURE_CARTE_DARK> !important; /* ex: rgba(100, 150, 255, .12) */
  box-shadow: 0 20px 40px rgba(0, 0, 0, .40), inset 0 1px 0 <REFLET_CARTE_DARK>;
}
.dark-theme .nom-espace-gradient .kc:hover,
.dark-theme .nom-espace-gradient .sc:hover {
  /* Astuce : utiliser la couleur accent en hover sombre (ex: or pour EU) */
  border-color: <COULEUR_ACCENT_DARK_HOVER> !important;
  box-shadow: 0 30px 60px rgba(0, 0, 0, .55), inset 0 1px 0 <REFLET_ACCENT_DARK>;
}

/* Lignes internes des cartes sc */
.nom-espace-gradient .sc .dash-row {
  background: rgba(255, 255, 255, .38) !important;
}
.nom-espace-gradient .sc .dash-row:hover {
  background: rgba(255, 255, 255, .65) !important;
}
.dark-theme .nom-espace-gradient .sc .dash-row {
  background: rgba(255, 255, 255, .04) !important;
}
.dark-theme .nom-espace-gradient .sc .dash-row:hover {
  background: <COULEUR_ACCENT_ROW_DARK_HOVER> !important;  /* ex: rgba(255, 215, 0, .05) */
}

/* ── 4. Instructions de l'équipe ─────────────────────────────────────────── */
.nom-espace-gradient .space-instructions {
  background: rgba(255, 255, 255, .42) !important;
  border: 1px solid <COULEUR_BORDURE_CARTE_CLAIR> !important;
  border-style: solid !important;
  backdrop-filter: blur(12px) saturate(130%);
  -webkit-backdrop-filter: blur(12px) saturate(130%);
  box-shadow: 0 8px 24px <OMBRE_CARTE_CLAIR>, inset 0 1px 0 rgba(255, 255, 255, .7);
  border-radius: 12px;
}
.dark-theme .nom-espace-gradient .space-instructions {
  background: <FOND_CARTE_DARK> !important;
  border-color: <COULEUR_BORDURE_CARTE_DARK> !important;
  border-style: solid !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, .20);
}

/* ── 5. Toolbar wrap (sélecteur de cycle) ────────────────────────────────── */
.nom-espace-gradient .toolbar-wrap {
  background: rgba(255, 255, 255, .46) !important;
  border: 1px solid <COULEUR_BORDURE_CARTE_CLAIR> !important;
  backdrop-filter: blur(14px) saturate(145%);
  -webkit-backdrop-filter: blur(14px) saturate(145%);
  box-shadow: 0 20px 40px <OMBRE_CARTE_CLAIR>, inset 0 1px 0 rgba(255, 255, 255, .75);
}
.nom-espace-gradient .toolbar-wrap:hover {
  box-shadow: 0 30px 60px <OMBRE_CARTE_CLAIR_HOVER>, inset 0 1px 0 rgba(255, 255, 255, .92);
  border-color: <COULEUR_BORDURE_CARTE_HOVER> !important;
}
.dark-theme .nom-espace-gradient .toolbar-wrap {
  background: <FOND_CARTE_DARK> !important;
  border-color: <COULEUR_BORDURE_CARTE_DARK> !important;
  box-shadow: 0 20px 40px rgba(0, 0, 0, .40), inset 0 1px 0 <REFLET_CARTE_DARK>;
}

/* ── 6. Boutons primaires ────────────────────────────────────────────────── */
/*
   Clair : translucide, la couleur principale ressort à travers le blur
   Sombre : quasi-transparent, hover avec accent (or, corail, etc.)
*/
.nom-espace-gradient .btn-primary {
  background: <FOND_BTN_PRIMARY_CLAIR> !important;       /* ex: rgba(30, 70, 200, .55) */
  border: 1px solid <BORDURE_BTN_PRIMARY_CLAIR> !important;
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  box-shadow: 0 4px 16px <OMBRE_BTN_PRIMARY>, inset 0 1px 0 rgba(255, 255, 255, .25);
  color: #fff !important;
  text-shadow: 0 1px 3px <OMBRE_TEXTE_BTN>;
}
.nom-espace-gradient .btn-primary:hover {
  background: <FOND_BTN_PRIMARY_HOVER> !important;
  border-color: <BORDURE_BTN_PRIMARY_HOVER> !important;
  box-shadow: 0 6px 22px <OMBRE_BTN_PRIMARY_HOVER>, inset 0 1px 0 rgba(255, 255, 255, .35);
}
.dark-theme .nom-espace-gradient .btn-primary {
  background: rgba(255, 255, 255, .07) !important;
  border: 1px solid <BORDURE_BTN_PRIMARY_DARK> !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, .40), inset 0 1px 0 rgba(255, 255, 255, .06);
  text-shadow: none;
}
.dark-theme .nom-espace-gradient .btn-primary:hover {
  background: rgba(255, 255, 255, .13) !important;
  border-color: <COULEUR_ACCENT_DARK> !important;          /* accent au hover sombre */
  box-shadow: 0 6px 22px rgba(0, 0, 0, .50), inset 0 1px 0 <REFLET_ACCENT_DARK>;
}

/* ── 7. Boutons secondaires ──────────────────────────────────────────────── */
.nom-espace-gradient .btn-secondary {
  background: rgba(255, 255, 255, .35) !important;
  border-color: <COULEUR_BORDURE_CARTE_CLAIR> !important;
  backdrop-filter: blur(16px) saturate(150%);
  -webkit-backdrop-filter: blur(16px) saturate(150%);
}
.nom-espace-gradient .btn-secondary:hover {
  background: rgba(255, 255, 255, .58) !important;
  border-color: <COULEUR_BORDURE_CARTE_HOVER> !important;
}
.dark-theme .nom-espace-gradient .btn-secondary {
  background: rgba(255, 255, 255, .07) !important;
  border-color: <COULEUR_BORDURE_CARTE_DARK> !important;
}
.dark-theme .nom-espace-gradient .btn-secondary:hover {
  background: rgba(255, 255, 255, .13) !important;
}

/* ── 8. Year tabs (sélecteur cycle) ─────────────────────────────────────── */
.nom-espace-gradient .year-tab {
  background: rgba(255, 255, 255, .25) !important;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.nom-espace-gradient .year-tab.active {
  background: <FOND_YEAR_TAB_ACTIVE_CLAIR> !important;    /* ex: rgba(26, 86, 219, .18) */
  border-color: <BORDURE_YEAR_TAB_ACTIVE_CLAIR> !important;
}
.dark-theme .nom-espace-gradient .year-tab {
  background: rgba(255, 255, 255, .05) !important;
}
.dark-theme .nom-espace-gradient .year-tab.active {
  background: <FOND_YEAR_TAB_ACTIVE_DARK> !important;
  border-color: <BORDURE_YEAR_TAB_ACTIVE_DARK> !important;
}

/* ── 9. Boutons de contrôle de section ──────────────────────────────────── */
.nom-espace-gradient .section-ctrl {
  background: rgba(255, 255, 255, .38) !important;
  border-color: <COULEUR_BORDURE_CARTE_CLAIR> !important;
  color: <COULEUR_TEXTE_SECONDAIRE> !important;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
.nom-espace-gradient .section-ctrl:hover {
  background: rgba(255, 255, 255, .65) !important;
  border-color: <COULEUR_PRINCIPALE> !important;
  color: <COULEUR_TEXTE_PRINCIPAL> !important;
  box-shadow: 0 2px 8px <OMBRE_CARTE_CLAIR>;
}
.dark-theme .nom-espace-gradient .section-ctrl {
  background: rgba(255, 255, 255, .06) !important;
  border-color: <COULEUR_BORDURE_CARTE_DARK> !important;
  color: <COULEUR_TEXTE_SECONDAIRE_DARK> !important;
}
.dark-theme .nom-espace-gradient .section-ctrl:hover {
  background: <FOND_CTRL_HOVER_DARK> !important;
  border-color: <BORDURE_CTRL_HOVER_DARK> !important;
  color: <COULEUR_TEXTE_PRINCIPAL_DARK> !important;
}

/* ── 10. Titres de sections et .sec ─────────────────────────────────────── */
.nom-espace-gradient .section-title {
  color: <COULEUR_TEXTE_PRINCIPAL> !important;
  border-bottom: 2px solid <COULEUR_SEPARATEUR_TITRE> !important;
  letter-spacing: -0.01em;
}
.dark-theme .nom-espace-gradient .section-title {
  color: <COULEUR_TEXTE_PRINCIPAL_DARK> !important;
  border-bottom-color: <COULEUR_SEPARATEUR_TITRE_DARK> !important;
}
.nom-espace-gradient .sec {
  color: <COULEUR_TEXTE_PRINCIPAL> !important;
}
.nom-espace-gradient .sec::after {
  background: <COULEUR_SEPARATEUR_SEC> !important;
}
.dark-theme .nom-espace-gradient .sec {
  color: <COULEUR_TEXTE_SECONDAIRE_DARK> !important;
}
.dark-theme .nom-espace-gradient .sec::after {
  background: <COULEUR_SEPARATEUR_SEC_DARK> !important;
}

/* ── 11. Onglets de navigation (ctx-tab) ─────────────────────────────────── */
.nom-espace-gradient .ctx-tab {
  color: <COULEUR_TEXTE_SECONDAIRE> !important;
}
.nom-espace-gradient .ctx-tab:hover {
  color: <COULEUR_TEXTE_PRINCIPAL> !important;
}
.nom-espace-gradient .ctx-tab.active {
  color: <COULEUR_PRINCIPALE> !important;
  border-bottom-color: <COULEUR_PRINCIPALE> !important;
}
.dark-theme .nom-espace-gradient .ctx-tab {
  color: <COULEUR_TEXTE_DISCRET_DARK> !important;
}
.dark-theme .nom-espace-gradient .ctx-tab:hover {
  color: <COULEUR_TEXTE_SECONDAIRE_DARK> !important;
}
.dark-theme .nom-espace-gradient .ctx-tab.active {
  color: <COULEUR_TEXTE_PRINCIPAL_DARK> !important;
  border-bottom-color: <COULEUR_TEXTE_PRINCIPAL_DARK> !important;
}

/* ── 12. Topbar teintée ──────────────────────────────────────────────────── */
.nom-espace-gradient .topbar {
  background: <FOND_TOPBAR_CLAIR>;         /* ex: rgba(210, 228, 255, .70) */
  border-bottom-color: <BORDURE_TOPBAR_CLAIR>;
}
.dark-theme .nom-espace-gradient .topbar {
  background: <FOND_TOPBAR_DARK>;          /* ex: rgba(4, 9, 26, .88) */
  border-bottom-color: <BORDURE_TOPBAR_DARK>;
}

/* ── 13. Barre de sous-onglets sticky ────────────────────────────────────── */
/*
   Classe ajoutée dans SpaceView.jsx sur le <div> sticky de la tab bar.
   Nommer : .nom-espace-tab-bar
*/
.nom-espace-tab-bar {
  background: <FOND_TAB_BAR_CLAIR> !important;       /* ex: rgba(205, 225, 255, .68) */
  border-bottom: 1px solid <BORDURE_TAB_BAR_CLAIR> !important;
}
.dark-theme .nom-espace-tab-bar {
  background: <FOND_TAB_BAR_DARK> !important;        /* ex: rgba(4, 10, 30, .82) */
  border-bottom: 1px solid <BORDURE_TAB_BAR_DARK> !important;
}

/* ── 14. Mur de discussion ───────────────────────────────────────────────── */
/* Bulles reçues */
.nom-espace-gradient .msg-bubble {
  background: rgba(255, 255, 255, .55) !important;
  border: 1px solid <COULEUR_BORDURE_CARTE_CLAIR> !important;
  backdrop-filter: blur(12px) saturate(130%);
  -webkit-backdrop-filter: blur(12px) saturate(130%);
  box-shadow: 0 4px 12px <OMBRE_CARTE_CLAIR>;
  color: <COULEUR_TEXTE_PRINCIPAL>;
}
.nom-espace-gradient .msg-author {
  color: <COULEUR_TEXTE_DISCRET> !important;
  font-weight: 600;
}
.nom-espace-gradient .msg-time {
  color: <COULEUR_TEXTE_SECONDAIRE> !important;
  opacity: 0.7;
}
.dark-theme .nom-espace-gradient .msg-bubble {
  background: <FOND_CARTE_DARK> !important;
  border-color: <COULEUR_BORDURE_CARTE_DARK> !important;
  color: <COULEUR_TEXTE_PRINCIPAL_DARK>;
}
/* Bulles envoyées */
.nom-espace-gradient .msg-row.mine .msg-bubble {
  background: <FOND_BULLE_ENVOYEE_CLAIR> !important;   /* ex: rgba(20, 60, 175, .85) */
  border: 1px solid <BORDURE_BULLE_ENVOYEE> !important;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 4px 16px <OMBRE_BULLE_ENVOYEE>;
  color: #fff !important;
}
.nom-espace-gradient .msg-row.mine .msg-time {
  color: <COULEUR_HEURE_BULLE_ENVOYEE> !important;     /* ex: rgba(200, 220, 255, .80) */
  opacity: 1;
}
.dark-theme .nom-espace-gradient .msg-row.mine .msg-bubble {
  background: <FOND_BULLE_ENVOYEE_DARK> !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, .30);
}

/* Zone de saisie du mur */
.nom-espace-gradient .space-wall .form-input {
  background: rgba(255, 255, 255, .45) !important;
  border-color: <COULEUR_BORDURE_CARTE_CLAIR> !important;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: <COULEUR_TEXTE_PRINCIPAL> !important;
}
.nom-espace-gradient .space-wall .form-input::placeholder {
  color: <COULEUR_PLACEHOLDER>;
}
.dark-theme .nom-espace-gradient .space-wall .form-input {
  background: <FOND_CARTE_DARK> !important;
  border-color: <COULEUR_BORDURE_CARTE_DARK> !important;
  color: <COULEUR_TEXTE_PRINCIPAL_DARK> !important;
}

/* ── 15. Chips inline sémantiques ────────────────────────────────────────── */
/*
   Ces classes sont ajoutées manuellement sur les boutons inline dans SpaceView.jsx.
   Les nommer par espace pour les isoler et éviter les conflits.
*/

/* Action / navigation */
.nom-espace-gradient .nom-espace-chip-blue {
  background: <FOND_CHIP_BLUE_CLAIR> !important;
  border: 1px solid <BORDURE_CHIP_BLUE_CLAIR> !important;
  color: <COULEUR_TEXTE_PRINCIPAL> !important;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: all .2s ease;
}
.nom-espace-gradient .nom-espace-chip-blue:hover {
  background: <FOND_CHIP_BLUE_HOVER> !important;
  border-color: <BORDURE_CHIP_BLUE_HOVER> !important;
}
.dark-theme .nom-espace-gradient .nom-espace-chip-blue {
  background: rgba(255, 255, 255, .06) !important;
  border-color: <BORDURE_CHIP_BLUE_DARK> !important;
  color: <COULEUR_TEXTE_SECONDAIRE_DARK> !important;
}

/* Danger / refus */
.nom-espace-gradient .nom-espace-chip-danger {
  background: rgba(220, 38, 38, .10) !important;
  border: 1px solid rgba(220, 38, 38, .28) !important;
  color: #b91c1c !important;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: all .2s ease;
}
/* (hover et dark identiques pour tous les espaces — le rouge est universel) */

/* Succès / restauration */
.nom-espace-gradient .nom-espace-chip-success {
  background: rgba(22, 163, 74, .10) !important;
  border: 1px solid rgba(22, 163, 74, .28) !important;
  color: #15803d !important;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: all .2s ease;
}

/* ── 16. Header — gradient animé + shimmer ───────────────────────────────── */
/*
   Classe ajoutée dans SpaceView.jsx sur le <div> header (bandeau titre).
   Nommer : .nom-espace-space-header
   Le shimmer est défini une seule fois — utiliser les mêmes @keyframes
   euHeaderDrift et euShimmer déjà déclarés, ou en créer des variantes.
*/
.nom-espace-space-header {
  position: relative;
  overflow: hidden;
  background: linear-gradient(130deg,
    <COULEUR_GRADIENT_H1> 0%,
    <COULEUR_GRADIENT_H2> 20%,
    <COULEUR_GRADIENT_H3> 40%,
    <COULEUR_GRADIENT_H4> 58%,
    <COULEUR_GRADIENT_H5> 78%,
    <COULEUR_GRADIENT_H6> 100%
  ) !important;
  background-size: 280% 280% !important;
  animation: euHeaderDrift 9s ease-in-out infinite;   /* réutiliser l'animation existante */
  box-shadow: 0 2px 20px <OMBRE_HEADER>;
}
/* Liseré accent en bas */
.nom-espace-space-header::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 1.5px;
  background: linear-gradient(90deg,
    transparent 0%,
    <COULEUR_ACCENT_LISERE> 30%,    /* ex: rgba(255, 215, 0, .55) — or EU */
    <COULEUR_ACCENT_LISERE_VIF> 50%,
    <COULEUR_ACCENT_LISERE> 70%,
    transparent 100%
  );
}
/* Balayage lumineux (22s — rare et naturel) */
.nom-espace-space-header::before {
  content: '';
  position: absolute;
  top: -50%; left: 0;
  width: 60px; height: 200%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.18), transparent);
  animation: euShimmer 22s ease-in-out infinite;      /* réutiliser l'animation existante */
  pointer-events: none;
}
/* Mode sombre */
.dark-theme .nom-espace-space-header {
  background: linear-gradient(130deg,
    <COULEUR_GRADIENT_H1_DARK> 0%,
    <COULEUR_GRADIENT_H2_DARK> 20%,
    <COULEUR_GRADIENT_H3_DARK> 40%,
    <COULEUR_GRADIENT_H4_DARK> 58%,
    <COULEUR_GRADIENT_H5_DARK> 78%,
    <COULEUR_GRADIENT_H6_DARK> 100%
  ) !important;
  background-size: 280% 280% !important;
  box-shadow: 0 2px 20px rgba(0, 0, 0, .50);
}
.dark-theme .nom-espace-space-header::after {
  background: linear-gradient(90deg,
    transparent 0%,
    <COULEUR_ACCENT_LISERE_DARK> 30%,
    <COULEUR_ACCENT_LISERE_VIF_DARK> 50%,
    <COULEUR_ACCENT_LISERE_DARK> 70%,
    transparent 100%
  );
}
```

---

## Valeurs de référence — Projet Europe

À titre de comparaison pour calibrer un nouvel espace :

```
Classe racine       : .europe-gradient
Classe header       : .eu-space-header
Classe tab bar      : .eu-tab-bar

Couleur principale  : #003399 / #1a56db (bleu EU)
Couleur accent      : rgba(255, 215, 0, …) (or drapeau EU)
Fond clair          : #e8eeff
Fond sombre         : #04091a

--text-base clair   : #0b1d45
--text-dim  clair   : #2c4d96
--text-muted clair  : #4a6cb8

--text-base sombre  : #eef3ff
--text-dim  sombre  : #9db8e8
--text-muted sombre : #6888c0

Bordure carte clair : rgba(170, 205, 255, .45)
Ombre carte clair   : rgba(0, 20, 80, .09)
Fond carte dark     : rgba(4, 14, 40, .62)
Bordure carte dark  : rgba(100, 150, 255, .12)
Reflet hover dark   : rgba(255, 215, 0, .18) — accent or
```

---

## Checklist création d'un nouvel espace

- [ ] Choisir la palette (1 couleur principale + 1 accent + déclinaisons claires/sombres)
- [ ] Ajouter la condition dans **Layout.jsx** (3 endroits)
- [ ] Ajouter la classe `eu-space-header` conditionnelle et vider le `background` inline dans **SpaceView.jsx**
- [ ] Ajouter la classe `eu-tab-bar` conditionnelle et vider les styles inline dans **SpaceView.jsx**
- [ ] Ajouter les classes `nom-espace-chip-*` sur les boutons inline dans **SpaceView.jsx**
- [ ] Créer le bloc CSS complet dans **glass.css** (copier le template, remplacer les `< >`)
- [ ] Vérifier les deux thèmes (clair / sombre) dans le navigateur
- [ ] Vérifier le scroll et l'absence de flash blanc au chargement
