const { registerExporter } = require('../index');
const { toCSV, toJSON } = require('../utils/csvFormatter');

registerExporter({
  key: 'appConfig',
  label: 'Configuration applicative',
  defaultFormat: 'json',
  fileName: (date, fmt) => `app-config_${date}.${fmt}`,

  async run(prisma, format) {
    const configs = await prisma.appConfig.findMany({ orderBy: { key: 'asc' } });
    if (format === 'json') return toJSON(configs);

    // En CSV : une ligne par clé, value sérialisé en JSON string
    const rows = configs.map(c => ({
      Clé: c.key,
      'Valeur (JSON)': JSON.stringify(c.value),
      'Mis à jour par': c.updatedBy || '',
      'Mis à jour le': c.updatedAt ? c.updatedAt.toISOString().slice(0, 10) : '',
    }));

    const headers = ['Clé','Valeur (JSON)','Mis à jour par','Mis à jour le'];
    return Buffer.from(toCSV(rows, headers), 'utf8');
  },
});
