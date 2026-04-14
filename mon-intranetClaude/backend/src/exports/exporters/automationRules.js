const { registerExporter } = require('../index');
const { toCSV, toJSON } = require('../utils/csvFormatter');

registerExporter({
  key: 'automationRules',
  label: 'Règles d\'automatisation',
  defaultFormat: 'csv',
  fileName: (date, fmt) => `automation-rules_${date}.${fmt}`,

  async run(prisma, format) {
    const rules = await prisma.automationRule.findMany({ orderBy: { createdAt: 'desc' } });
    if (format === 'json') return toJSON(rules);

    const rows = rules.map(r => ({
      ID: r.id,
      Nom: r.nom || '',
      Description: r.description || '',
      Actif: r.isActive ? 'Oui' : 'Non',
      'Délai déclenchement (jours)': r.triggerOffsetDays || 0,
      'Référence date': r.triggerDateRef || '',
      'Filtre types action': (r.actionTypeFilter || []).join(', '),
      'Pôle cible': r.targetPole || '',
      'Texte tâche': r.taskText || '',
      'Description tâche': r.taskDescription || '',
      'Créé par': r.createdBy || '',
      'Créé le': r.createdAt ? r.createdAt.toISOString().slice(0, 10) : '',
    }));

    const headers = ['ID','Nom','Description','Actif','Délai déclenchement (jours)','Référence date','Filtre types action','Pôle cible','Texte tâche','Description tâche','Créé par','Créé le'];
    return Buffer.from(toCSV(rows, headers), 'utf8');
  },
});
