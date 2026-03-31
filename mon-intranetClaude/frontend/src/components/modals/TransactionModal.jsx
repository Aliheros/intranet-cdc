// src/components/modals/TransactionModal.jsx
import React from 'react';
import { POLES } from '../../data/constants';
import { ArrowDownCircle, X } from 'lucide-react';
import { useModalClose } from '../../hooks/useModalClose';

const TransactionModal = ({ isOpen, onClose, transaction, onChange, onSave, devisFactures }) => {
  const { isClosing, handleClose } = useModalClose(onClose);
  if (!isOpen || !transaction) return null;

  return (
    <div className={`modal-overlay${isClosing ? " is-closing" : ""}`} style={{ zIndex: 5000 }} onClick={handleClose}>
      <div className={`modal-box${isClosing ? " is-closing" : ""}`} style={{ width: "100%", maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-title">
            <ArrowDownCircle size={16} strokeWidth={1.8} />
            {transaction.id ? "Modifier la transaction" : "Nouvelle transaction"}
          </div>
          <button className="modal-close-btn" onClick={handleClose}><X size={14} strokeWidth={2} /></button>
        </div>

        <div className="modal-body" style={{ gap: 16 }}>
          <div>
            <label className="form-label">Type</label>
            <select className="form-select" value={transaction.type} onChange={(e) => onChange({ ...transaction, type: e.target.value })}>
              <option value="Dépense">Dépense</option>
              <option value="Recette">Recette</option>
            </select>
          </div>
          <div>
            <label className="form-label">Libellé</label>
            <input type="text" className="form-input" value={transaction.libelle} onChange={(e) => onChange({ ...transaction, libelle: e.target.value })} placeholder="Ex: Achat fournitures" />
          </div>
          <div className="form-2col">
            <div>
              <label className="form-label">Montant (€)</label>
              <input type="number" className="form-input" value={transaction.montant} onChange={(e) => onChange({ ...transaction, montant: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Date</label>
              <input type="date" className="form-input" value={transaction.date} onChange={(e) => onChange({ ...transaction, date: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="form-label">Imputation (Budget)</label>
            <select className="form-select" value={transaction.imputation} onChange={(e) => onChange({ ...transaction, imputation: e.target.value })}>
              <option value="Fonctionnement Global">Fonctionnement Global</option>
              {POLES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Catégorie</label>
            <select className="form-select" value={transaction.categorie || ''} onChange={e => onChange({ ...transaction, categorie: e.target.value })}>
              <option value="">— Sélectionner —</option>
              {['Fonctionnement', 'Communication', 'Matériel', 'Formation', 'Déplacement', 'Événement', 'Autre'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          {transaction.type === 'Dépense' && (
            <div>
              <label className="form-label">Lier à un devis / facture</label>
              <select className="form-select" value={transaction.devisFactureId || ''} onChange={e => onChange({ ...transaction, devisFactureId: e.target.value ? Number(e.target.value) : null })}>
                <option value="">— Aucun —</option>
                {(devisFactures || []).filter(df => df.statut === 'Signé').map(df => (
                  <option key={df.id} value={df.id}>{df.titre} ({df.montant} €)</option>
                ))}
              </select>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0 4px' }}>
            <input type="checkbox" id="horseBudget" checked={!!transaction.horseBudget} onChange={e => onChange({ ...transaction, horseBudget: e.target.checked, horseBudgetRaison: e.target.checked ? transaction.horseBudgetRaison : '' })} style={{ width: 16, height: 16, cursor: 'pointer' }} />
            <label htmlFor="horseBudget" style={{ fontSize: 13, fontWeight: 600, color: transaction.horseBudget ? '#e63946' : 'var(--text-dim)', cursor: 'pointer' }}>Dépense hors budget</label>
          </div>
          {transaction.horseBudget && (
            <div>
              <label className="form-label">Raison / justification hors budget</label>
              <textarea className="form-input" rows={2} style={{ resize: 'vertical' }} value={transaction.horseBudgetRaison || ''} onChange={e => onChange({ ...transaction, horseBudgetRaison: e.target.value })} placeholder="Expliquez pourquoi cette dépense dépasse le budget prévu…" />
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={handleClose}>Annuler</button>
          <button className="btn-primary" onClick={onSave}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
};

export default TransactionModal;