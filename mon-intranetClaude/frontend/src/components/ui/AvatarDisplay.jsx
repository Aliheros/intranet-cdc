// AvatarDisplay — affichage unifié des avatars (photo URL ou initiales)
import React, { useState } from 'react';

export const isAvatarUrl = (avatar) =>
  !!avatar && (avatar.startsWith('/') || avatar.startsWith('http'));

/**
 * Génère des initiales robustes depuis un nom complet.
 * Toujours retourne au moins "?" — jamais null/undefined.
 */
export function makeInitials(nom) {
  const parts = (nom || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return '?';
}

/**
 * Recherche robuste dans le directory par nom :
 * - normalise NFC (é vs e+combining accent)
 * - ignore la casse et les espaces superflus
 * Toujours utiliser ça plutôt que directory.find(d => d.nom === name).
 */
export function findMemberByName(directory, name) {
  if (!name || !directory?.length) return undefined;
  const norm = s => (s || '').trim().normalize('NFC').toLowerCase();
  const target = norm(name);
  return directory.find(d => norm(d.nom) === target);
}

/**
 * Contenu interne d'un cercle avatar : <img> si URL, initiales sinon.
 * Gère le cas d'échec de chargement d'image (fallback sur initiales).
 * Toujours affiche quelque chose — jamais vide.
 */
export function AvatarInner({ avatar, nom }) {
  const [imgError, setImgError] = useState(false);

  if (isAvatarUrl(avatar) && !imgError) {
    return (
      <img
        src={avatar}
        alt={nom || ''}
        onError={() => setImgError(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }}
      />
    );
  }
  // avatar peut être null/undefined/'' ou image en erreur → fallback sur initiales du nom
  const text = (avatar && !isAvatarUrl(avatar) && !imgError) ? avatar : makeInitials(nom);
  return text || '?';
}

/**
 * Cercle avatar complet.
 * Props : avatar, nom, size (px), bg (couleur fond si initiales), color (texte), fontSize, style, className
 */
export default function AvatarDisplay({ avatar, nom, size = 32, bg = '#1a56db', color = '#fff', fontSize, style = {}, className }) {
  const [imgError, setImgError] = useState(false);
  const isImg = isAvatarUrl(avatar) && !imgError;
  const initials = !isImg
    ? (avatar && !isAvatarUrl(avatar) ? avatar : makeInitials(nom))
    : '';
  const fs = fontSize || Math.max(8, Math.round(size * 0.35));

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: isImg ? 'transparent' : bg,
        color,
        fontSize: fs,
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexShrink: 0,
        ...style,
      }}
    >
      {isImg ? (
        <img
          src={avatar}
          alt={nom || ''}
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (initials || '?')}
    </div>
  );
}
