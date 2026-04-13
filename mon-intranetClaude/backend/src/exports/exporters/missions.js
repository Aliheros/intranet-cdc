const { registerExporter } = require('../index');
const { toCSV, toJSON } = require('../utils/csvFormatter');

registerExporter({
  key: 'missions',
  label: 'Missions',
  defaultFormat: 'csv',
  fileName: (date, fmt) => `missions_${date}.${fmt}`,

  async run(prisma, format) {
    const missions = await prisma.mission.findMany({ orderBy: { createdAt: 'desc' } });
    if (format === 'json') return toJSON(missions);

    const rows = missions.map(m => ({
      ID: m.id,
      Titre: m.titre || '',
      Pôle: m.pole || '',
      Projet: m.projet || '',
      Type: m.type || '',
      Description: m.description || '',
      Compétences: (m.competences || []).join(', '),
      Durée: m.duree || '',
      Urgence: m.urgence || '',
      Statut: m.statut || '',
      'Créé par': m.createdBy || '',
      Responsable: m.responsable || '',
      'Action liée ID': m.linkedActionId || '',
      'Date début': m.dateDebut || '',
      'Date fin': m.dateFin || '',
      'Candidatures (JSON)': JSON.stringify(m.candidatures || []),
      'Créé le': m.createdAt ? m.createdAt.toISOString().slice(0, 10) : '',
    }));

    const headers = ['ID','Titre','Pôle','Projet','Type','Description','Compétences','Durée','Urgence','Statut','Créé par','Responsable','Action liée ID','Date début','Date fin','Candidatures (JSON)','Créé le'];
    return Buffer.from(toCSV(rows, headers), 'utf8');
  },
});
