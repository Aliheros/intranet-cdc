// src/services/mailer.js
const nodemailer = require('nodemailer');

const isConfigured = () =>
  !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let transporter = null;
const getTransporter = () => {
  if (!transporter && isConfigured()) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
};

const FROM = () => process.env.SMTP_FROM || `"Intranet" <${process.env.SMTP_USER}>`;
const APP_URL = () => process.env.APP_URL || 'http://localhost:5174';

// ─── Échappement HTML — empêche le XSS dans les emails ───────────────────────
const escHtml = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ─── Template HTML générique ────────────────────────────────────────────────
function buildHtml({ titre, contenu, category, ctaLabel, ctaUrl }) {
  const categoryLabels = {
    annonces:   { label: 'Annonce', color: '#1a56db', bg: '#eff6ff' },
    taches:     { label: 'Tâche',   color: '#d97706', bg: '#fffbeb' },
    messagerie: { label: 'Message', color: '#7c3aed', bg: '#f5f3ff' },
    evenements: { label: 'Événement', color: '#0891b2', bg: '#ecfeff' },
    notesFrais: { label: 'Note de frais', color: '#16a34a', bg: '#f0fdf4' },
    missions:   { label: 'Mission', color: '#e63946', bg: '#fff5f5' },
  };
  const cat = categoryLabels[category] || categoryLabels.annonces;

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:30px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- HEADER -->
        <tr>
          <td style="background:linear-gradient(135deg,#0f2d5e,#1a56db);padding:28px 32px;">
            <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Intranet</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.6);margin-top:4px;text-transform:uppercase;letter-spacing:1px;">Notification</div>
          </td>
        </tr>
        <!-- CATEGORY BADGE -->
        <tr>
          <td style="padding:24px 32px 0 32px;">
            <span style="display:inline-block;background:${cat.bg};color:${cat.color};font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;text-transform:uppercase;letter-spacing:0.08em;">${cat.label}</span>
          </td>
        </tr>
        <!-- BODY -->
        <tr>
          <td style="padding:16px 32px 24px 32px;">
            <h2 style="margin:0 0 12px 0;font-size:20px;font-weight:800;color:#0f2d5e;line-height:1.3;">${escHtml(titre)}</h2>
            <p style="margin:0;font-size:14px;color:#475569;line-height:1.7;white-space:pre-line;">${escHtml(contenu)}</p>
          </td>
        </tr>
        ${ctaLabel && ctaUrl ? `
        <!-- CTA -->
        <tr>
          <td style="padding:0 32px 28px 32px;">
            <a href="${escHtml(ctaUrl)}" style="display:inline-block;background:#1a56db;color:#ffffff;font-size:13px;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;">${escHtml(ctaLabel)}</a>
          </td>
        </tr>` : ''}
        <!-- FOOTER -->
        <tr>
          <td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:11px;color:#94a3b8;">Vous recevez cet email car vous avez activé les notifications par email. Pour modifier vos préférences, rendez-vous dans <strong>Mon Profil → Notifications</strong>.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Envoi principal ─────────────────────────────────────────────────────────
async function sendNotifEmail({ to, subject, titre, contenu, category, ctaLabel, ctaUrl }) {
  if (!isConfigured()) return; // SMTP non configuré, on ignore silencieusement
  const t = getTransporter();
  if (!t) return;
  try {
    await t.sendMail({
      from: FROM(),
      to,
      subject: subject || `[Intranet] ${titre}`,
      html: buildHtml({ titre, contenu, category, ctaLabel, ctaUrl: ctaUrl || APP_URL() }),
    });
    console.log(`[Mailer] Email envoyé → ${to} (${category})`);
  } catch (err) {
    console.error(`[Mailer] Échec envoi → ${to} :`, err.message);
  }
}

// ─── Dispatcher : envoie à une liste d'users filtrés par préférence ──────────
async function dispatchToUsers({ users, preferenceKey, subject, titre, contenu, ctaLabel, ctaUrl }) {
  const targets = users.filter(u => {
    const emailDest = u.emailPerso || u.email;
    if (!emailDest) return false;
    const prefs = (typeof u.emailPreferences === 'object' && u.emailPreferences !== null)
      ? u.emailPreferences
      : {};
    // Par défaut activé si préférence non encore configurée
    return prefs[preferenceKey] !== false;
  });

  await Promise.allSettled(
    targets.map(u =>
      sendNotifEmail({
        to: u.emailPerso || u.email,
        subject,
        titre,
        contenu,
        category: preferenceKey,
        ctaLabel,
        ctaUrl,
      })
    )
  );
}

module.exports = { sendNotifEmail, dispatchToUsers };
