// src/components/ui/DocRow.jsx
import React from 'react';
import { typeColor } from '../../data/constants';
import Badge from './Badge';
import { Download, Trash2 } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace('/api', '');

const DocRow = ({ d, canEdit, onDelete, sections, onChangeSection }) => (
  <div
    className="doc-row"
    style={{
      display: "flex",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 8,
      padding: "11px 18px",
      borderBottom: "1px solid var(--border-light)",
      fontSize: 13,
    }}
  >
    <span
      style={{
        background: typeColor[d.type] || "#888",
        color: "#fff",
        fontSize: 10,
        fontWeight: 700,
        padding: "2px 7px",
        borderRadius: 3,
        flexShrink: 0,
      }}
    >
      {d.type}
    </span>
    <span className="doc-name" style={{ flex: 1, minWidth: 100, fontWeight: 500, color: "var(--text-base)" }}>
      {d.nom}
    </span>
    {d.tag === "sim-parl" && (
      <Badge label="Sim. Parl." bg="#fef3c7" c="#d97706" />
    )}
    <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>
      {d.taille}
    </span>
    <span style={{ fontSize: 11, color: "var(--text-dim)", flexShrink: 0 }}>
      {d.cycle}
    </span>

    {canEdit ? (
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <select
          className="form-select"
          style={{ fontSize: 11, padding: "2px 4px", maxWidth: 100 }}
          value={d.section || "Général"}
          onChange={(e) => onChangeSection(d.id, e.target.value)}
        >
          {sections.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {d.url ? (
          <a
            href={`${API_BASE}${d.url}`}
            download={d.nom}
            style={{ display: "inline-flex", alignItems: "center", color: "#1a56db", cursor: "pointer" }}
            title="Télécharger"
          >
            <Download size={14} strokeWidth={1.8} />
          </a>
        ) : (
          <span style={{ display: "inline-flex", alignItems: "center", color: "var(--text-muted)" }} title="Fichier non disponible">
            <Download size={14} strokeWidth={1.8} />
          </span>
        )}
        <span
          style={{ display: "inline-flex", alignItems: "center", color: "#e63946", cursor: "pointer" }}
          onClick={onDelete}
          title="Mettre à la corbeille"
        >
          <Trash2 size={14} strokeWidth={1.8} />
        </span>
      </div>
    ) : (
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <span
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            border: "1px solid var(--border-light)",
            padding: "2px 6px",
            borderRadius: 4,
          }}
        >
          {d.section || "Général"}
        </span>
        {d.url ? (
          <a
            href={`${API_BASE}${d.url}`}
            download={d.nom}
            style={{ display: "inline-flex", alignItems: "center", color: "#1a56db", cursor: "pointer" }}
            title="Télécharger"
          >
            <Download size={14} strokeWidth={1.8} />
          </a>
        ) : (
          <span style={{ display: "inline-flex", alignItems: "center", color: "var(--text-muted)" }} title="Fichier non disponible">
            <Download size={14} strokeWidth={1.8} />
          </span>
        )}
      </div>
    )}
  </div>
);

export default DocRow;
