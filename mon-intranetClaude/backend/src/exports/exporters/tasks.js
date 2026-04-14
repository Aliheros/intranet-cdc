const { registerExporter } = require('../index');
const { toCSV, toJSON } = require('../utils/csvFormatter');

registerExporter({
  key: 'tasks',
  label: 'Tâches',
  defaultFormat: 'csv',
  fileName: (date, fmt) => `tasks_${date}.${fmt}`,

  async run(prisma, format) {
    const tasks = await prisma.task.findMany({ orderBy: { createdAt: 'desc' } });
    if (format === 'json') return toJSON(tasks);

    const rows = tasks.map(t => ({
      ID: t.id,
      Espace: t.space || '',
      Texte: t.text || '',
      Description: t.description || '',
      Cycle: t.cycle || '',
      Deadline: t.deadline || '',
      Statut: t.status || '',
      'Créé par': t.createdBy || '',
      'Verrouillé par': t.lockedBy || '',
      'Forcé terminé par': t.forceCompletedBy || '',
      'Terminé le': t.completedAt ? t.completedAt.toISOString().slice(0, 10) : '',
      'Action ID': t.actionId || '',
      'Assignés (JSON)': JSON.stringify(t.assignees || []),
      'Créé le': t.createdAt ? t.createdAt.toISOString().slice(0, 10) : '',
    }));

    const headers = ['ID','Espace','Texte','Description','Cycle','Deadline','Statut','Créé par','Verrouillé par','Forcé terminé par','Terminé le','Action ID','Assignés (JSON)','Créé le'];
    return Buffer.from(toCSV(rows, headers), 'utf8');
  },
});
