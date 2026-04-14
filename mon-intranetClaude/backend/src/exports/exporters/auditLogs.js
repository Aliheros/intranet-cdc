const { registerExporter } = require('../index');
const { toCSV, toJSON } = require('../utils/csvFormatter');

registerExporter({
  key: 'auditLogs',
  label: 'Journal d\'audit',
  defaultFormat: 'json',
  fileName: (date, fmt) => `audit-logs_${date}.${fmt}`,

  async run(prisma, format) {
    const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' } });
    if (format === 'json') return toJSON(logs);

    const rows = logs.map(l => ({
      ID: l.id,
      'Acteur ID': l.actorId || '',
      'Acteur nom': l.actorNom || '',
      Action: l.action || '',
      'Cible ID': l.targetId || '',
      'Cible type': l.targetType || '',
      'Cible nom': l.targetNom || '',
      IP: l.ip || '',
      'Payload (JSON)': JSON.stringify(l.payload || {}),
      'Horodatage': l.createdAt ? l.createdAt.toISOString() : '',
    }));

    const headers = ['ID','Acteur ID','Acteur nom','Action','Cible ID','Cible type','Cible nom','IP','Payload (JSON)','Horodatage'];
    return Buffer.from(toCSV(rows, headers), 'utf8');
  },
});
