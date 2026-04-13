const { registerExporter } = require('../index');
const { toCSV, toJSON } = require('../utils/csvFormatter');

registerExporter({
  key: 'contacts',
  label: 'Contacts externes',
  defaultFormat: 'csv',
  fileName: (date, fmt) => `contacts_${date}.${fmt}`,

  async run(prisma, format) {
    const contacts = await prisma.contact.findMany({ orderBy: { nom: 'asc' } });
    if (format === 'json') return toJSON(contacts);

    const rows = contacts.map(c => ({
      ID: c.id,
      Nom: c.nom || '',
      Fonction: c.fonction || '',
      Organisme: c.organisme || '',
      Email: c.email || '',
      Téléphone: c.telephone || '',
      'Créé par': c.createdBy || '',
      'Sollicitations (JSON)': JSON.stringify(c.sollicitations || []),
      'Créé le': c.createdAt ? c.createdAt.toISOString().slice(0, 10) : '',
    }));

    const headers = ['ID','Nom','Fonction','Organisme','Email','Téléphone','Créé par','Sollicitations (JSON)','Créé le'];
    return Buffer.from(toCSV(rows, headers), 'utf8');
  },
});
