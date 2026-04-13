const { registerExporter } = require('../index');
const { toCSV, toJSON } = require('../utils/csvFormatter');

registerExporter({
  key: 'notesFrais',
  label: 'Notes de frais',
  defaultFormat: 'csv',
  fileName: (date, fmt) => `notes-frais_${date}.${fmt}`,

  async run(prisma, format) {
    const ndfs = await prisma.noteFrais.findMany({ orderBy: { createdAt: 'desc' } });
    if (format === 'json') return toJSON(ndfs);

    const rows = ndfs.map(n => ({
      'N° Dossier': n.numeroDossier,
      'Demandeur ID': n.demandeurId || '',
      'Demandeur nom': n.demandeurNom || '',
      Date: n.date || '',
      Catégorie: n.categorie || '',
      'Montant (€)': n.montant || 0,
      Description: n.description || '',
      Justificatif: n.justificatif || '',
      Projet: n.projet || '',
      Pôle: n.pole || '',
      'Action liée ID': n.linkedActionId || '',
      Statut: n.statut || '',
      'Commentaire trésorerie': n.commentaireTresorerie || '',
      'Transaction ID': n.transactionId || '',
      'Suppression demandée': n.suppressionDemandee ? 'Oui' : 'Non',
      'Historique (JSON)': JSON.stringify(n.historique || []),
      'Créé le': n.createdAt ? n.createdAt.toISOString().slice(0, 10) : '',
    }));

    const headers = ['N° Dossier','Demandeur ID','Demandeur nom','Date','Catégorie','Montant (€)','Description','Justificatif','Projet','Pôle','Action liée ID','Statut','Commentaire trésorerie','Transaction ID','Suppression demandée','Historique (JSON)','Créé le'];
    return Buffer.from(toCSV(rows, headers), 'utf8');
  },
});
