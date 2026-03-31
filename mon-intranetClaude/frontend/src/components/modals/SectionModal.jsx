// src/components/modals/SectionModal.jsx
import React, { useState, useEffect } from 'react';
import { FolderPlus, Pencil, X } from 'lucide-react';
import { useModalClose } from '../../hooks/useModalClose';

const SectionModal = ({ isOpen, initialName, onClose, onSave }) => {
  const [name, setName] = useState("");

  useEffect(() => {
    if (isOpen) setName(initialName || "");
  }, [isOpen, initialName]);

  const { isClosing, handleClose } = useModalClose(onClose);
  if (!isOpen) return null;

  return (
    <div className={`modal-overlay${isClosing ? " is-closing" : ""}`} style={{ zIndex: 5000 }} onClick={handleClose}>
      <div className={`modal-box${isClosing ? " is-closing" : ""}`} style={{ width: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-title">
            {initialName ? <><Pencil size={16} strokeWidth={1.8} /> Renommer la section</> : <><FolderPlus size={16} strokeWidth={1.8} /> Nouvelle section</>}
          </div>
          <button className="modal-close-btn" onClick={handleClose}><X size={14} strokeWidth={2} /></button>
        </div>

        <div className="modal-body">
          <label className="form-label">Nom de la section (Dossier)</label>
          <input className="form-input" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Factures, Réunions..." onKeyDown={e => e.key === 'Enter' && name.trim() && onSave(name.trim())} />
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={handleClose}>Annuler</button>
          <button className="btn-primary" onClick={() => { if(name.trim()) onSave(name.trim()); }}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
};

export default SectionModal;