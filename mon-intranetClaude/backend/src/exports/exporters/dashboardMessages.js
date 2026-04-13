const { registerExporter } = require('../index');
const { toCSV, toJSON } = require('../utils/csvFormatter');

registerExporter({
  key: 'dashboardMessages',
  label: 'Messages tableau de bord',
  defaultFormat: 'csv',
  fileName: (date, fmt) => `dashboard-messages_${date}.${fmt}`,

  async run(prisma, format) {
    const messages = await prisma.dashboardMessage.findMany({ orderBy: { createdAt: 'desc' } });
    if (format === 'json') return toJSON(messages);

    const rows = messages.map(m => ({
      ID: m.id,
      Contenu: m.contenu || '',
      Actif: m.actif ? 'Oui' : 'Non',
      'Utilisateurs ciblés': (m.cibleUsers || []).join(', '),
      'Pôles ciblés': (m.ciblePoles || []).join(', '),
      'Projets ciblés': (m.cibleProjets || []).join(', '),
      'Rôles ciblés': (m.cibleRoles || []).join(', '),
      'Genres ciblés': (m.cibleGenres || []).join(', '),
      'Âge min': m.cibleAgeMin || '',
      'Âge max': m.cibleAgeMax || '',
      'Créé le': m.createdAt ? m.createdAt.toISOString().slice(0, 10) : '',
    }));

    const headers = ['ID','Contenu','Actif','Utilisateurs ciblés','Pôles ciblés','Projets ciblés','Rôles ciblés','Genres ciblés','Âge min','Âge max','Créé le'];
    return Buffer.from(toCSV(rows, headers), 'utf8');
  },
});
