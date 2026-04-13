const { registerExporter } = require('../index');
const { toCSV, toJSON } = require('../utils/csvFormatter');

registerExporter({
  key: 'actions',
  label: 'Actions terrain',
  defaultFormat: 'csv',
  fileName: (date, fmt) => `actions_${date}.${fmt}`,

  async run(prisma, format) {
    const actions = await prisma.action.findMany({ orderBy: { createdAt: 'desc' } });
    if (format === 'json') return toJSON(actions);

    const rows = actions.map(a => ({
      ID: a.id,
      Type: a.type,
      Établissement: a.etablissement,
      Ville: a.ville || '',
      Adresse: a.adresse || '',
      'Contact nom': a.contact_nom || '',
      'Contact email': a.contact_email || '',
      'Contact tel': a.contact_tel || '',
      Cycle: a.cycle || '',
      Responsables: (a.responsables || []).join(', '),
      Statut: a.statut,
      Projet: a.projet || '',
      Bénéficiaires: a.beneficiaires || 0,
      'Type classe': a.type_classe || '',
      Département: a.departement || '',
      Arrondissement: a.arrondissement || '',
      'Label REP': a.labelRep || '',
      'Institution simulée': a.institutionSimulee || '',
      Heures: a.heures || 0,
      'Budget prévisionnel (€)': a.budgetPrevisionnel || 0,
      'Dépenses réelles (€)': a.depensesReelles || 0,
      'Score complétion': a.completionScore || 0,
      Archivé: a.isArchived ? 'Oui' : 'Non',
      'Date début': a.date_debut || '',
      'Date fin': a.date_fin || '',
      Notes: a.notes || '',
      'Checklist (JSON)': JSON.stringify(a.checklist || {}),
      'Bilan (JSON)': JSON.stringify(a.bilan || {}),
      'Timeline (JSON)': JSON.stringify(a.timeline || []),
      'Créé le': a.createdAt ? a.createdAt.toISOString().slice(0, 10) : '',
    }));

    const headers = ['ID','Type','Établissement','Ville','Adresse','Contact nom','Contact email','Contact tel','Cycle','Responsables','Statut','Projet','Bénéficiaires','Type classe','Département','Arrondissement','Label REP','Institution simulée','Heures','Budget prévisionnel (€)','Dépenses réelles (€)','Score complétion','Archivé','Date début','Date fin','Notes','Checklist (JSON)','Bilan (JSON)','Timeline (JSON)','Créé le'];
    return Buffer.from(toCSV(rows, headers), 'utf8');
  },
});
