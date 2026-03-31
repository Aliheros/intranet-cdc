// src/components/modals/EditSpaceModal.jsx
import React, { useState, useEffect } from 'react';
import { Settings, X } from 'lucide-react';
import { useModalClose } from '../../hooks/useModalClose';

const EditSpaceModal = ({ isOpen, space, initialData, onClose, onSave }) => {
  const [desc, setDesc] = useState("");
  const [instr, setInstr] = useState("");

  useEffect(() => {
    if (isOpen) {
      setDesc(initialData?.description || "");
      setInstr(initialData?.instructions || "");
    }
  }, [isOpen, initialData]);

  const { isClosing, handleClose } = useModalClose(onClose);
  if (!isOpen) return null;

  return (
    <div className={`modal-overlay${isClosing ? " is-closing" : ""}`} style={{ zIndex: 5000 }} onClick={handleClose}>
      <div className={`modal-box${isClosing ? " is-closing" : ""}`} style={{ width: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-title"><Settings size={16} strokeWidth={1.8} /> Paramètres de l'espace</div>
          <button className="modal-close-btn" onClick={handleClose}><X size={14} strokeWidth={2} /></button>
        </div>

        <div className="modal-body" style={{ gap: 16 }}>
          <div>
            <label className="form-label">Description du pôle/projet (Publique)</label>
            <textarea className="form-input" rows={3} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ex: Ce pôle a pour mission de..." />
          </div>
          <div>
            <label className="form-label">Instructions de l'équipe (Interne)</label>
            <textarea className="form-input" rows={4} value={instr} onChange={e => setInstr(e.target.value)} placeholder="Ex: N'oubliez pas de ranger les documents dans les bons dossiers." />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={handleClose}>Annuler</button>
          <button className="btn-primary" onClick={() => onSave({ description: desc, instructions: instr })}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
};

export default EditSpaceModal;