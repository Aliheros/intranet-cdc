const { registerExporter } = require('../index');
const { toCSV, toJSON } = require('../utils/csvFormatter');

registerExporter({
  key: 'impactStudies',
  label: 'Études d\'impact',
  defaultFormat: 'csv',
  fileName: (date, fmt) => `impact-studies_${date}.${fmt}`,

  async run(prisma, format) {
    const studies = await prisma.impactStudy.findMany({ orderBy: { createdAt: 'desc' } });
    if (format === 'json') return toJSON(studies);

    const rows = studies.map(s => ({
      ID: s.id,
      Cycle: s.cycle || '',
      "Type d'action": s.typeAction || '',
      'Nb bénéficiaires': s.nbBeneficiaires || 0,
      'Nb ateliers': s.nbAteliers || 0,
      'Nb établissements': s.nbEtablissements || 0,
      'Heures accompagnement': s.heuresAccompagnement || 0,
      'Heure moy par bénéf': s.heureMoyParBenef || 0,
      'Nb bénévoles': s.nbBenevoles || 0,
      '% apprécié': s.pctApprecie || 0,
      '% très apprécié': s.pctTresApprecie || 0,
      '% emballé initial': s.pctEmballeInitial || 0,
      'Delta connaissance député': s.deltaConnaissanceDepute || 0,
      'Delta connaissance AN': s.deltaConnaissanceAN || 0,
      'Delta intention vote': s.deltaVoteIntent || 0,
      'Delta engagement': s.deltaEngagement || 0,
      '% bénévole satisfait': s.pctBenevoleSatisfait || 0,
      '% bénévole très satisfait': s.pctBenevoleTresSatisfait || 0,
      '% bénévoles nouvelles compét': s.pctBenevolesNouvellesCompet || 0,
      '% bénévoles parle politique': s.pctBenevolesParlePoliti || 0,
      'Âge moyen bénévoles': s.ageMoyenBenevoles || 0,
      '% nouvelles recrues': s.pctNouvellesRecru || 0,
      Notes: s.notes || '',
      'Créé par': s.createdBy || '',
      'Créé le': s.createdAt ? s.createdAt.toISOString().slice(0, 10) : '',
    }));

    const headers = ['ID','Cycle',"Type d'action",'Nb bénéficiaires','Nb ateliers','Nb établissements','Heures accompagnement','Heure moy par bénéf','Nb bénévoles','% apprécié','% très apprécié','% emballé initial','Delta connaissance député','Delta connaissance AN','Delta intention vote','Delta engagement','% bénévole satisfait','% bénévole très satisfait','% bénévoles nouvelles compét','% bénévoles parle politique','Âge moyen bénévoles','% nouvelles recrues','Notes','Créé par','Créé le'];
    return Buffer.from(toCSV(rows, headers), 'utf8');
  },
});
