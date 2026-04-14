const { registerExporter } = require('../index');
const { toCSV, toJSON } = require('../utils/csvFormatter');

registerExporter({
  key: 'notifications',
  label: 'Notifications',
  defaultFormat: 'csv',
  fileName: (date, fmt) => `notifications_${date}.${fmt}`,

  async run(prisma, format) {
    const notifs = await prisma.notification.findMany({ orderBy: { createdAt: 'desc' } });
    if (format === 'json') return toJSON(notifs);

    const rows = notifs.map(n => ({
      ID: n.id,
      Titre: n.titre || '',
      Contenu: n.contenu || '',
      Auteur: n.auteur || '',
      Cible: n.cible || '',
      'Pôles ciblés': (n.targetPoles || []).join(', '),
      'Utilisateurs ciblés': (n.targetUsers || []).join(', '),
      Priorité: n.priorite || '',
      'Lu par (nb)': (n.lu || []).length,
      'Créé le': n.createdAt ? n.createdAt.toISOString().slice(0, 10) : '',
    }));

    const headers = ['ID','Titre','Contenu','Auteur','Cible','Pôles ciblés','Utilisateurs ciblés','Priorité','Lu par (nb)','Créé le'];
    return Buffer.from(toCSV(rows, headers), 'utf8');
  },
});
