const { registerExporter } = require('../index');
const { toCSV, toJSON } = require('../utils/csvFormatter');

registerExporter({
  key: 'faq',
  label: 'FAQ',
  defaultFormat: 'csv',
  fileName: (date, fmt) => `faq_${date}.${fmt}`,

  async run(prisma, format) {
    const faqs = await prisma.faq.findMany({ orderBy: { ordre: 'asc' } });
    if (format === 'json') return toJSON(faqs);

    const rows = faqs.map(f => ({
      ID: f.id,
      Catégorie: f.categorie || '',
      Question: f.question || '',
      Réponse: f.reponse || '',
      Ordre: f.ordre || 0,
      'Créé par': f.createdBy || '',
      'Créé le': f.createdAt ? f.createdAt.toISOString().slice(0, 10) : '',
    }));

    const headers = ['ID','Catégorie','Question','Réponse','Ordre','Créé par','Créé le'];
    return Buffer.from(toCSV(rows, headers), 'utf8');
  },
});
