const { registerExporter } = require('../index');
const { toCSV, toJSON } = require('../utils/csvFormatter');

registerExporter({
  key: 'budgets',
  label: 'Budgets pôles',
  defaultFormat: 'csv',
  fileName: (date, fmt) => `budgets_${date}.${fmt}`,

  async run(prisma, format) {
    const budgets = await prisma.budget.findMany({ orderBy: { pole: 'asc' } });
    if (format === 'json') return toJSON(budgets);

    const rows = budgets.map(b => ({
      ID: b.id,
      Pôle: b.pole || '',
      'Montant (€)': b.montant || 0,
    }));

    const headers = ['ID','Pôle','Montant (€)'];
    return Buffer.from(toCSV(rows, headers), 'utf8');
  },
});
