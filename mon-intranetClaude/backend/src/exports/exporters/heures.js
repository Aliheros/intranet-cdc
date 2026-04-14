const { registerExporter } = require('../index');
const { toCSV, toJSON } = require('../utils/csvFormatter');

registerExporter({
  key: 'heures',
  label: 'Heures bénévoles',
  defaultFormat: 'csv',
  fileName: (date, fmt) => `heures-benevoles_${date}.${fmt}`,

  async run(prisma, format) {
    const heures = await prisma.hour.findMany({ orderBy: { date: 'desc' } });
    if (format === 'json') return toJSON(heures);

    const rows = heures.map(h => ({
      ID: h.id,
      'User ID': h.userId || '',
      Bénévole: h.userNomSnapshot || '',
      'Action ID': h.actionId || '',
      'Événement ID': h.eventId || '',
      Type: h.type || '',
      Heures: h.hours || 0,
      Date: h.date || '',
      Statut: h.status || '',
      'Créé le': h.createdAt ? h.createdAt.toISOString().slice(0, 10) : '',
    }));

    const headers = ['ID','User ID','Bénévole','Action ID','Événement ID','Type','Heures','Date','Statut','Créé le'];
    return Buffer.from(toCSV(rows, headers), 'utf8');
  },
});
