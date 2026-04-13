const { registerExporter } = require('../index');
const { toCSV, toJSON } = require('../utils/csvFormatter');

registerExporter({
  key: 'seancePresences',
  label: 'Présences séances',
  defaultFormat: 'csv',
  fileName: (date, fmt) => `seance-presences_${date}.${fmt}`,

  async run(prisma, format) {
    const presences = await prisma.seancePresence.findMany({ orderBy: { createdAt: 'desc' } });
    if (format === 'json') return toJSON(presences);

    const rows = presences.map(p => ({
      ID: p.id,
      'Événement ID': p.evenementId,
      'Événement titre': p.evenementTitre || '',
      'Séance ID': p.seanceId || '',
      'Date séance': p.seanceDate || '',
      'Membre nom': p.membreNom || '',
      Heures: p.heures || 0,
      'Statut responsable': p.resp1Statut || '',
      'Validé par responsable': p.resp1Par || '',
      'Date validation responsable': p.resp1At ? p.resp1At.toISOString().slice(0, 10) : '',
      'Statut RH': p.rhStatut || '',
      'Validé par RH': p.rhPar || '',
      'Date validation RH': p.rhAt ? p.rhAt.toISOString().slice(0, 10) : '',
      'Hour ID': p.hourId || '',
      'Créé le': p.createdAt ? p.createdAt.toISOString().slice(0, 10) : '',
    }));

    const headers = ['ID','Événement ID','Événement titre','Séance ID','Date séance','Membre nom','Heures','Statut responsable','Validé par responsable','Date validation responsable','Statut RH','Validé par RH','Date validation RH','Hour ID','Créé le'];
    return Buffer.from(toCSV(rows, headers), 'utf8');
  },
});
