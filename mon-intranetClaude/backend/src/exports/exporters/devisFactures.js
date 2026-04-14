const { registerExporter } = require('../index');
const { toCSV, toJSON } = require('../utils/csvFormatter');

registerExporter({
  key: 'devisFactures',
  label: 'Devis & Factures',
  defaultFormat: 'csv',
  fileName: (date, fmt) => `devis-factures_${date}.${fmt}`,

  async run(prisma, format) {
    const dfs = await prisma.devisFacture.findMany({ orderBy: { createdAt: 'desc' } });
    if (format === 'json') return toJSON(dfs);

    const rows = dfs.map(d => ({
      ID: d.id,
      Titre: d.titre || '',
      Description: d.description || '',
      Type: d.type || '',
      Catégorie: d.categorie || '',
      'Montant (€)': d.montant || 0,
      Émetteur: d.emetteur || '',
      Destinataire: d.destinataire || '',
      'Hors budget': d.horseBudget ? 'Oui' : 'Non',
      Statut: d.statut || '',
      Signataire: d.signataire || '',
      'Signé le': d.signedAt ? d.signedAt.toISOString().slice(0, 10) : '',
      'Soumis le': d.soumisAt ? d.soumisAt.toISOString().slice(0, 10) : '',
      'Traité par': d.traitePar || '',
      'Traité le': d.traiteAt ? d.traiteAt.toISOString().slice(0, 10) : '',
      'Motif refus': d.motifRefus || '',
      Notes: d.notes || '',
      'Transaction ID': d.transactionId || '',
      'Créé par': d.createdBy || '',
      'Fichiers (JSON)': JSON.stringify(d.fichiers || []),
      'Commentaires (JSON)': JSON.stringify(d.commentaires || []),
      'Historique (JSON)': JSON.stringify(d.historique || []),
      'Créé le': d.createdAt ? d.createdAt.toISOString().slice(0, 10) : '',
    }));

    const headers = ['ID','Titre','Description','Type','Catégorie','Montant (€)','Émetteur','Destinataire','Hors budget','Statut','Signataire','Signé le','Soumis le','Traité par','Traité le','Motif refus','Notes','Transaction ID','Créé par','Fichiers (JSON)','Commentaires (JSON)','Historique (JSON)','Créé le'];
    return Buffer.from(toCSV(rows, headers), 'utf8');
  },
});
