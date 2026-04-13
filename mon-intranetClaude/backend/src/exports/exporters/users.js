const { registerExporter } = require('../index');
const { toCSV, toJSON } = require('../utils/csvFormatter');

registerExporter({
  key: 'users',
  label: 'Utilisateurs',
  defaultFormat: 'csv',
  fileName: (date, fmt) => `utilisateurs_${date}.${fmt}`,

  async run(prisma, format) {
    const users = await prisma.user.findMany({ orderBy: { nom: 'asc' } });
    if (format === 'json') return toJSON(users.map(u => { const { passwordHash, ...rest } = u; return rest; }));

    const rows = users.map(u => ({
      ID: u.id,
      Nom: u.nom,
      Prénom: u.prenom,
      Email: u.email,
      'Email perso': u.emailPerso || '',
      Téléphone: u.telephone || '',
      Pôle: u.pole || '',
      Rôle: u.role,
      Statut: u.statut,
      Genre: u.genre || '',
      'Date de naissance': u.dateNaissance || '',
      Compétences: (u.competences || []).join(', '),
      Projets: (u.projets || []).join(', '),
      Désactivé: u.isDeleted ? 'Oui' : 'Non',
      'Date désactivation': u.deletedAt ? u.deletedAt.toISOString().slice(0, 10) : '',
      'Raison désactivation': u.deleteReason || '',
      'Congés (JSON)': JSON.stringify(u.conges || {}),
      'Profil volontaire (JSON)': JSON.stringify(u.profileVolontaire || {}),
      'Commentaires RH (JSON)': JSON.stringify(u.commentairesRH || {}),
      'Historique RH (JSON)': JSON.stringify(u.historiqueRH || {}),
      'Notes RH': u.notesRH || '',
      'Créé le': u.createdAt ? u.createdAt.toISOString().slice(0, 10) : '',
    }));

    const headers = ['ID','Nom','Prénom','Email','Email perso','Téléphone','Pôle','Rôle','Statut','Genre','Date de naissance','Compétences','Projets','Désactivé','Date désactivation','Raison désactivation','Congés (JSON)','Profil volontaire (JSON)','Commentaires RH (JSON)','Historique RH (JSON)','Notes RH','Créé le'];
    return Buffer.from(toCSV(rows, headers), 'utf8');
  },
});
