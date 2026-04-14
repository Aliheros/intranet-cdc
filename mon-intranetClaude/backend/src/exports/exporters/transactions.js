const { registerExporter } = require('../index');
const { toCSV, toJSON } = require('../utils/csvFormatter');

registerExporter({
  key: 'transactions',
  label: 'Transactions',
  defaultFormat: 'csv',
  fileName: (date, fmt) => `transactions_${date}.${fmt}`,

  async run(prisma, format) {
    const transactions = await prisma.transaction.findMany({ orderBy: { date: 'desc' } });
    if (format === 'json') return toJSON(transactions);

    const rows = transactions.map(t => ({
      ID: t.id,
      Date: t.date || '',
      Libellé: t.libelle || '',
      Type: t.type || '',
      'Montant (€)': t.montant || 0,
      Imputation: t.imputation || '',
      Statut: t.statut || '',
      Catégorie: t.categorie || '',
      'Créé par': t.createdBy || '',
      'Hors budget': t.horseBudget ? 'Oui' : 'Non',
      'Raison hors budget': t.horseBudgetRaison || '',
      'Approuvé hors budget par': t.horseBudgetApprovedBy || '',
      'Devis/Facture ID': t.devisFactureId || '',
      'Fichiers (JSON)': JSON.stringify(t.fichiers || []),
      'Créé le': t.createdAt ? t.createdAt.toISOString().slice(0, 10) : '',
    }));

    const headers = ['ID','Date','Libellé','Type','Montant (€)','Imputation','Statut','Catégorie','Créé par','Hors budget','Raison hors budget','Approuvé hors budget par','Devis/Facture ID','Fichiers (JSON)','Créé le'];
    return Buffer.from(toCSV(rows, headers), 'utf8');
  },
});
