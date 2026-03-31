// src/components/modals/ManageTeamModal.jsx
import React, { useState, useEffect } from 'react';
import { Users, X } from 'lucide-react';
import { useModalClose } from '../../hooks/useModalClose';
import { MEMBER_STATUS } from '../ui/StatusIcon';

const ManageTeamModal = ({ isOpen, space, year, currentTeam, directory, onClose, onSave }) => {
  const [team, setTeam] = useState([]);

  useEffect(() => {
    if (isOpen) {
      // Filter out ghost members (deleted users not in directory anymore)
      const validNoms = new Set((directory || []).map(d => d.nom));
      setTeam((currentTeam || []).filter(m => validNoms.has(m.nom)));
    }
  }, [isOpen, currentTeam, directory]);

  const { isClosing, handleClose } = useModalClose(onClose);
  if (!isOpen) return null;

  const toggleMember = (nom) => {
    setTeam(prev => {
      if (prev.find(m => m.nom === nom)) return prev.filter(m => m.nom !== nom);
      return [...prev, { nom, role: "Membre" }];
    });
  };

  const changeRole = (nom, newRole) => {
    setTeam(prev => prev.map(m => m.nom === nom ? { ...m, role: newRole } : m));
  };

  return (
    <div className={`modal-overlay${isClosing ? " is-closing" : ""}`} style={{ zIndex: 5000 }} onClick={handleClose}>
      <div className={`modal-box${isClosing ? " is-closing" : ""}`} style={{ width: 450, maxHeight: "85vh" }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-title"><Users size={16} strokeWidth={1.8} /> Équipe {space} ({year})</div>
          <button className="modal-close-btn" onClick={handleClose}><X size={14} strokeWidth={2} /></button>
        </div>

        <div className="modal-body" style={{ gap: 20 }}>
          <div className="section-label">Membres sélectionnés</div>
          {team.length === 0 && <div className="empty" style={{ padding: 10 }}>Aucun membre.</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {team.map(m => (
              <div key={m.nom} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-hover)", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-light)" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{m.nom}</span>
                <select className="form-select" style={{ width: 130, padding: "4px 8px" }} value={m.role} onChange={(e) => changeRole(m.nom, e.target.value)}>
                  <option value="Responsable">Responsable</option>
                  <option value="Membre">Membre</option>
                  <option value="Observateur">Observateur</option>
                </select>
              </div>
            ))}
          </div>

          <div className="section-label">Annuaire</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {directory.map(user => {
              const isSelected = team.some(m => m.nom === user.nom);
              return (
                <div key={user.nom} onClick={() => toggleMember(user.nom)} style={{ padding: "6px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `1px solid ${isSelected ? "#1a56db" : "var(--border-light)"}`, background: isSelected ? "rgba(26,86,219,0.1)" : "var(--bg-surface)", color: isSelected ? "#1a56db" : "var(--text-dim)", display: "flex", alignItems: "center", gap: 5 }}>
                  {isSelected ? "✓ " : "+ "}{user.nom}
                  {(() => { const s = MEMBER_STATUS[user.statut]; return s ? <s.Icon size={10} color={s.color} strokeWidth={2} style={{ flexShrink: 0 }} /> : null; })()}
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={handleClose}>Annuler</button>
          <button className="btn-primary" onClick={() => onSave(team)}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
};

export default ManageTeamModal;