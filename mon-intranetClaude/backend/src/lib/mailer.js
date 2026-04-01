// src/lib/mailer.js
// Envoi d'emails transactionnels via SMTP (nodemailer).
// Toutes les fonctions sont best-effort : elles ne lèvent jamais d'erreur.

const nodemailer = require('nodemailer');
const log = require('./logger');

const isConfigured =
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS &&
  process.env.SMTP_USER !== 'TON_ADRESSE@gmail.com';

let transporter = null;
if (isConfigured) {
  transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Envoie un email HTML (best-effort, ne lève jamais).
 * @param {object} opts
 * @param {string|string[]} opts.to
 * @param {string}  opts.subject
 * @param {string}  opts.html
 * @param {string}  [opts.text]  — version texte brut (optionnel)
 */
const sendMail = async ({ to, subject, html, text }) => {
  if (!transporter) {
    log.debug({ subject }, '[Mailer] SMTP non configuré — email ignoré');
    return;
  }
  try {
    await transporter.sendMail({
      from:    process.env.SMTP_FROM || process.env.SMTP_USER,
      to:      Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ''),
    });
    log.info({ to, subject }, '[Mailer] Email envoyé');
  } catch (err) {
    log.error({ err, subject }, '[Mailer] Échec envoi email');
  }
};

// ─── Templates ───────────────────────────────────────────────────────────────

const APP_URL = process.env.APP_URL || 'http://localhost:5173';

const wrapHtml = (titre, contenu) => `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden">
    <div style="background:#0f2d5e;padding:20px 28px">
      <div style="color:#fff;font-size:18px;font-weight:700">${titre}</div>
    </div>
    <div style="padding:24px 28px;font-size:14px;color:#334155;line-height:1.6">
      ${contenu}
    </div>
    <div style="padding:16px 28px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8">
      Intranet CDC · <a href="${APP_URL}" style="color:#1a56db">Accéder à l'intranet</a>
    </div>
  </div>
</body>
</html>`;

/**
 * Email de notification pour un changement de statut de devis/facture.
 */
const sendDevisFactureNotif = async ({ to, subject, titreDf, montant, statut, message, lien }) => {
  const statutColor = {
    'Soumis':          '#1a56db',
    'En traitement':   '#d97706',
    'Modif. demandée': '#d97706',
    'Signé':           '#16a34a',
    'Refusé':          '#e63946',
  }[statut] || '#64748b';

  const html = wrapHtml(subject, `
    <p>${message}</p>
    <div style="margin:16px 0;padding:14px 18px;background:#f8fafc;border-radius:8px;border-left:4px solid ${statutColor}">
      <div style="font-weight:700;font-size:15px;margin-bottom:4px">${titreDf}</div>
      <div style="color:#64748b;font-size:13px">${montant} €</div>
      <div style="margin-top:6px">
        <span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;background:${statutColor}22;color:${statutColor}">${statut}</span>
      </div>
    </div>
    ${lien ? `<p><a href="${lien}" style="display:inline-block;padding:8px 18px;background:#0f2d5e;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px">Voir le dossier</a></p>` : ''}
  `);
  await sendMail({ to, subject, html });
};

module.exports = { sendMail, sendDevisFactureNotif };
