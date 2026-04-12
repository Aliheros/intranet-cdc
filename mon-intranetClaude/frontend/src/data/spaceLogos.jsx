// src/data/spaceLogos.jsx — logos SVG partagés pôles/projets
import React from 'react';
import { Users, GraduationCap, TrendingUp, Compass } from 'lucide-react';

const EuStars = () => (
  <svg width="30" height="30" viewBox="0 0 30 30">
    {Array.from({ length: 12 }, (_, i) => {
      const a = (i * 30 - 90) * Math.PI / 180;
      const x = 15 + 10.5 * Math.cos(a), y = 15 + 10.5 * Math.sin(a);
      return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="5.5" fill="rgba(255,215,0,0.95)">★</text>;
    })}
  </svg>
);

const RadioWaves = () => (
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="13" cy="13" r="2.5" fill="#fff" stroke="none"/>
    <path d="M7.5 13 a5.5 5.5 0 0 1 5.5-5.5" opacity="0.6"/><path d="M18.5 13 a5.5 5.5 0 0 0-5.5-5.5" opacity="0.6"/>
    <path d="M4 13 a9 9 0 0 1 9-9" opacity="0.35"/><path d="M22 13 a9 9 0 0 0-9-9" opacity="0.35"/>
  </svg>
);

const VaultIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <rect x="2" y="3" width="24" height="21" rx="3" stroke="#fff" strokeWidth="1.6"/>
    <rect x="22" y="10" width="4" height="8" rx="1" stroke="#fff" strokeWidth="1.4"/>
    <circle cx="13" cy="13.5" r="5.5" stroke="#fff" strokeWidth="1.5"/>
    <circle cx="13" cy="13.5" r="2" fill="rgba(255,255,255,0.4)" stroke="#fff" strokeWidth="1.2"/>
    {[0,72,144,216,288].map((deg,i) => {
      const a = (deg - 90) * Math.PI / 180;
      return <line key={i} x1={13 + 3.5*Math.cos(a)} y1={13.5 + 3.5*Math.sin(a)} x2={13 + 5.5*Math.cos(a)} y2={13.5 + 5.5*Math.sin(a)} stroke="#fff" strokeWidth="1.3"/>;
    })}
    <line x1="13" y1="13.5" x2="15.8" y2="10.8" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const ScalesIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <line x1="14" y1="3" x2="14" y2="25"/>
    <line x1="10" y1="25" x2="18" y2="25"/>
    <line x1="5" y1="8" x2="23" y2="8"/>
    <circle cx="14" cy="4.5" r="1.8" fill="#fff" stroke="none"/>
    <path d="M5 8 L3 15 L7 15 Z" fill="rgba(255,255,255,0.25)"/>
    <line x1="3" y1="15" x2="7" y2="15"/>
    <path d="M23 8 L21 15 L25 15 Z" fill="rgba(255,255,255,0.15)"/>
    <line x1="21" y1="15" x2="25" y2="15"/>
  </svg>
);

const HumanNetwork = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <circle cx="14" cy="6" r="3" stroke="#fff" strokeWidth="1.5"/>
    <circle cx="5" cy="20" r="2.5" stroke="#fff" strokeWidth="1.5"/>
    <circle cx="23" cy="20" r="2.5" stroke="#fff" strokeWidth="1.5"/>
    <line x1="14" y1="9" x2="14" y2="13" stroke="#fff" strokeWidth="1.4"/>
    <line x1="14" y1="13" x2="6" y2="18" stroke="#fff" strokeWidth="1.4"/>
    <line x1="14" y1="13" x2="22" y2="18" stroke="#fff" strokeWidth="1.4"/>
    <circle cx="14" cy="13" r="1.5" fill="rgba(255,255,255,0.5)" stroke="#fff" strokeWidth="1.2"/>
    <line x1="7.5" y1="20" x2="20.5" y2="20" stroke="#fff" strokeWidth="1.2" strokeDasharray="2 2"/>
  </svg>
);

const CitizenPath = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <circle cx="6" cy="22" r="2.5" fill="rgba(255,255,255,0.5)" stroke="#fff" strokeWidth="1.4"/>
    <circle cx="14" cy="14" r="2.5" fill="rgba(255,255,255,0.7)" stroke="#fff" strokeWidth="1.4"/>
    <circle cx="22" cy="6" r="2.5" fill="#fff" stroke="#fff" strokeWidth="1.4"/>
    <path d="M8 20.5 Q11 17 12 15" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    <path d="M16 13 Q19 10 20 7.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    <path d="M19 4 L22 6 L20 9" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);

export const SPACE_LOGO = {
  // Pôles
  "Relations Publiques":     <Users size={24} strokeWidth={1.5} color="#fff" />,
  "Ressources Humaines":     <HumanNetwork />,
  "Plaidoyer":               <ScalesIcon />,
  "Etudes":                  <GraduationCap size={24} strokeWidth={1.5} color="#fff" />,
  "Développement Financier": <TrendingUp size={24} strokeWidth={1.5} color="#fff" />,
  "Communication":           <RadioWaves />,
  "Trésorerie":              <VaultIcon />,
  // Projets
  "Europe":                  <EuStars />,
  "Parcours Citoyen":        <CitizenPath />,
  "Orientation":             <Compass size={24} strokeWidth={1.5} color="#fff" />,
};
