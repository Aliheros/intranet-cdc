const { registerExporter } = require('../index');
const { toCSV, toJSON } = require('../utils/csvFormatter');

registerExporter({
  key: 'taskRequests',
  label: 'Demandes de tâches',
  defaultFormat: 'csv',
  fileName: (date, fmt) => `task-requests_${date}.${fmt}`,

  async run(prisma, format) {
    const requests = await prisma.taskRequest.findMany({ orderBy: { createdAt: 'desc' } });
    if (format === 'json') return toJSON(requests);

    const rows = requests.map(r => ({
      ID: r.id,
      Texte: r.text || '',
      Description: r.description || '',
      Espace: r.space || '',
      'Demandé par': r.requestedBy || '',
      Cycle: r.cycle || '',
      Deadline: r.deadline || '',
      Statut: r.status || '',
      'Action ID': r.actionId || '',
      'Assignés (JSON)': JSON.stringify(r.assignees || []),
      'Pool cible (JSON)': JSON.stringify(r.targetPool || []),
      'Créé le': r.createdAt ? r.createdAt.toISOString().slice(0, 10) : '',
    }));

    const headers = ['ID','Texte','Description','Espace','Demandé par','Cycle','Deadline','Statut','Action ID','Assignés (JSON)','Pool cible (JSON)','Créé le'];
    return Buffer.from(toCSV(rows, headers), 'utf8');
  },
});
