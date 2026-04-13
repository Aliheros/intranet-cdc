const { registerExporter } = require('../index');
const { toCSV, toJSON } = require('../utils/csvFormatter');

registerExporter({
  key: 'evenements',
  label: 'Événements',
  defaultFormat: 'csv',
  fileName: (date, fmt) => `evenements_${date}.${fmt}`,

  async run(prisma, format) {
    const events = await prisma.evenement.findMany({ orderBy: { date: 'desc' } });
    if (format === 'json') return toJSON(events);

    const rows = events.map(e => ({
      ID: e.id,
      Titre: e.titre,
      Date: e.date || '',
      Cycle: e.cycle || '',
      Lieu: e.lieu || '',
      'Action ID': e.actionId || '',
      Description: e.description || '',
      Pôles: (e.poles || []).join(', '),
      Projet: e.projet || '',
      Équipe: (e.equipe || []).join(', '),
      'Responsable nom': e.responsableNom || '',
      Statut: e.statut || '',
      Archivé: e.isArchived ? 'Oui' : 'Non',
      'WhatsApp link': e.whatsappLink || '',
      'Fichiers (JSON)': JSON.stringify(e.fichiers || []),
      'Séances (JSON)': JSON.stringify(e.seances || []),
      'Créé le': e.createdAt ? e.createdAt.toISOString().slice(0, 10) : '',
    }));

    const headers = ['ID','Titre','Date','Cycle','Lieu','Action ID','Description','Pôles','Projet','Équipe','Responsable nom','Statut','Archivé','WhatsApp link','Fichiers (JSON)','Séances (JSON)','Créé le'];
    return Buffer.from(toCSV(rows, headers), 'utf8');
  },
});
