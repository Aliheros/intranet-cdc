// src/components/modals/ProfileModal.jsx
import React from 'react';
import { POLE_COLORS } from '../../data/constants';
import Badge from '../ui/Badge';
import { ClipboardList, CheckCircle2, Target, X, Umbrella, CalendarRange } from 'lucide-react';
import { useModalClose } from '../../hooks/useModalClose';
import { StatusBadge, MEMBER_STATUS, ACTION_STATUS } from '../ui/StatusIcon';
import { AvatarInner, isAvatarUrl } from '../ui/AvatarDisplay';

const ProfileModal = ({ isOpen, onClose, userProfile, actions = [], tasks = [], missions = [] }) => {
  const { isClosing, handleClose } = useModalClose(onClose);
  if (!isOpen || !userProfile) return null;

  const poleColor = POLE_COLORS[userProfile.pole] || "#1a56db";

  return (
    <div className={`modal-overlay${isClosing ? " is-closing" : ""}`} style={{ zIndex: 5000 }} onClick={handleClose}>
      <div className={`modal-box${isClosing ? " is-closing" : ""}`} style={{ width: "100%", maxWidth: 450, maxHeight: "88vh" }} onClick={e => e.stopPropagation()}>
        {/* Bandeau couleur pôle + avatar + identité — section fixe non scrollable */}
        <div style={{ flexShrink: 0 }}>
          <div style={{
            height: 96,
            background: `linear-gradient(135deg, ${poleColor} 0%, #1e293b 100%)`,
            borderRadius: "16px 16px 0 0",
            position: "relative",
          }}>
            <button onClick={handleClose} style={{
              position: "absolute", top: 14, right: 14,
              background: "rgba(255,255,255,0.2)", border: "none", color: "white",
              width: 32, height: 32, borderRadius: "50%", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <X size={14} strokeWidth={2} />
            </button>
          </div>
          <div style={{ padding: "0 24px 16px", textAlign: "center" }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: isAvatarUrl(userProfile.avatar) ? "transparent" : poleColor, color: "white",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, fontWeight: 700,
              border: "4px solid var(--bg-surface)",
              margin: "-40px auto 14px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              position: "relative", zIndex: 1, overflow: "hidden",
            }}>
              <AvatarInner avatar={userProfile.avatar} nom={userProfile.nom} />
            </div>
            <h2 style={{ margin: "0 0 4px 0", fontSize: 20, fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--text-base)" }}>
              {userProfile.nom}
            </h2>
            <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 14 }}>{userProfile.email}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
              {/* Pôle principal */}
              <Badge label={userProfile.pole} bg={poleColor + "20"} c={poleColor} size={12} />
              {/* Pôles supplémentaires via permissions */}
              {(userProfile.permissions || [])
                .filter(p => p.pole && p.pole !== userProfile.pole && p.level !== "none")
                .map(p => {
                  const col = POLE_COLORS[p.pole] || "#6b7280";
                  const roleLabel = p.level === "edit" ? "Responsable" : "Membre";
                  return (
                    <span key={p.pole} style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                      background: col + "18", color: col, border: `1px solid ${col}40`,
                    }}>
                      {p.pole}
                      <span style={{ fontSize: 9, opacity: 0.7, fontWeight: 400 }}>· {roleLabel}</span>
                    </span>
                  );
                })
              }
              {/* Projets */}
              {(userProfile.projets || []).map(proj => (
                <span key={proj} style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: "rgba(26,86,219,0.08)", color: "#1a56db", border: "1px solid rgba(26,86,219,0.2)",
                }}>
                  {proj}
                  <span style={{ fontSize: 9, opacity: 0.7, fontWeight: 400 }}>· Projet</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Corps scrollable */}
        <div style={{ overflowY: "auto", flex: 1, padding: "0 24px 24px", textAlign: "center" }}>

          {/* Infos */}
          <div style={{ marginTop: 8, textAlign: "left" }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", borderBottom: "1px solid var(--border-light)", paddingBottom: 8, marginBottom: 12 }}>
              Informations
            </div>
            <div style={{ fontSize: 13, color: "var(--text-base)", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--text-muted)" }}>Statut</span>
                <span style={{ fontWeight: 600 }}><StatusBadge map={MEMBER_STATUS} value={userProfile.statut} size={12} /></span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--text-muted)" }}>Dernière connexion</span>
                <span style={{ color: "var(--text-dim)" }}>{userProfile.derniereConnexion || "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--text-muted)" }}>Disponibilités</span>
                <span style={{ color: "var(--text-dim)", textAlign: "right", maxWidth: "55%" }}>{userProfile.dispos || "Non renseigné"}</span>
              </div>
            </div>
          </div>

          {/* Responsabilités actives */}
          {(() => {
            const memberName = userProfile?.nom;
            const myActions = actions.filter(a => !a.isArchived && (a.responsables || []).includes(memberName));
            const myTasks = tasks.filter(t => t.status !== "Terminé" && (t.assignees || []).some(a => a.name === memberName));
            const myMissions = missions.filter(m => m.responsable === memberName && m.statut !== "Fermée" && m.statut !== "Annulée");
            if (!myActions.length && !myTasks.length && !myMissions.length) return null;
            return (
              <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--border-light)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 12 }}>
                  Responsabilités actives
                </div>
                {myActions.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                      <ClipboardList size={11} strokeWidth={1.8} /> Actions ({myActions.length})
                    </div>
                    {myActions.slice(0, 3).map(a => (
                      <div key={a.id} style={{ fontSize: 12, color: "var(--text-base)", padding: "4px 8px", background: "var(--bg-alt)", borderRadius: 6, marginBottom: 4 }}>
                        <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span>{a.etablissement}</span>
                          <StatusBadge map={ACTION_STATUS} value={a.statut} size={10} />
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {myTasks.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                      <CheckCircle2 size={11} strokeWidth={1.8} /> Tâches en cours ({myTasks.length})
                    </div>
                    {myTasks.slice(0, 3).map(t => (
                      <div key={t.id} style={{ fontSize: 12, color: "var(--text-base)", padding: "4px 8px", background: "var(--bg-alt)", borderRadius: 6, marginBottom: 4 }}>
                        {t.text} {t.deadline && <span style={{ fontSize: 10, color: "#d97706" }}>· {t.deadline}</span>}
                      </div>
                    ))}
                  </div>
                )}
                {myMissions.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                      <Target size={11} strokeWidth={1.8} /> Missions ({myMissions.length})
                    </div>
                    {myMissions.slice(0, 3).map(m => (
                      <div key={m.id} style={{ fontSize: 12, color: "var(--text-base)", padding: "4px 8px", background: "var(--bg-alt)", borderRadius: 6, marginBottom: 4 }}>
                        {m.titre} <span style={{ fontSize: 10, color: "var(--text-muted)" }}>· {m.pole}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── CONGÉS ── */}
          {(() => {
            const today = new Date().toISOString().split('T')[0];
            const conges = Array.isArray(userProfile.conges) ? userProfile.conges : [];
            const active = conges.find(c => c.debut <= today && (!c.fin || c.fin >= today));
            const upcoming = conges.filter(c => c.debut > today).sort((a, b) => a.debut.localeCompare(b.debut));
            const past = conges.filter(c => c.fin && c.fin < today).sort((a, b) => b.fin.localeCompare(a.fin)).slice(0, 3);
            if (!active && !upcoming.length && !past.length) return null;
            const fmt = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
            return (
              <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--border-light)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 10, display: "flex", alignItems: "center", gap: 5 }}>
                  <Umbrella size={11} strokeWidth={1.8} /> Congés
                </div>
                {active && (
                  <div style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.2)", marginBottom: 6, fontSize: 12 }}>
                    <div style={{ fontWeight: 700, color: "#f97316", marginBottom: 2 }}>En congé actuellement</div>
                    <div style={{ color: "var(--text-muted)", fontSize: 11 }}>
                      Depuis le {fmt(active.debut)} · {active.fin ? `Retour le ${fmt(active.fin)}` : "Retour non défini"}
                      {active.motif ? ` · ${active.motif}` : ""}
                    </div>
                  </div>
                )}
                {upcoming.map(c => (
                  <div key={c.id} style={{ padding: "7px 10px", borderRadius: 8, background: "rgba(26,86,219,0.04)", border: "1px solid rgba(26,86,219,0.12)", marginBottom: 5, fontSize: 11, display: "flex", alignItems: "center", gap: 6 }}>
                    <CalendarRange size={11} color="#1a56db" strokeWidth={1.8} />
                    <span style={{ color: "var(--text-base)", fontWeight: 600 }}>Prévu</span>
                    <span style={{ color: "var(--text-muted)" }}>{fmt(c.debut)}{c.fin ? ` → ${fmt(c.fin)}` : " · durée indéterminée"}{c.motif ? ` · ${c.motif}` : ""}</span>
                  </div>
                ))}
                {past.map(c => (
                  <div key={c.id} style={{ padding: "6px 10px", borderRadius: 7, background: "var(--bg-hover)", marginBottom: 4, fontSize: 11, color: "var(--text-muted)", opacity: 0.7, display: "flex", alignItems: "center", gap: 6 }}>
                    <CalendarRange size={10} strokeWidth={1.8} />
                    <span>{fmt(c.debut)} → {fmt(c.fin)}{c.motif ? ` · ${c.motif}` : ""}</span>
                  </div>
                ))}
              </div>
            );
          })()}

          <button onClick={handleClose} style={{
            marginTop: 22, width: "100%", padding: "10px", borderRadius: 8,
            border: "1px solid var(--border-light)", background: "var(--bg-alt)",
            color: "var(--text-base)", cursor: "pointer", fontWeight: 600, fontSize: 13,
          }}>
            Fermer
          </button>
        </div>{/* fin corps scrollable */}
      </div>
    </div>
  );
};

export default ProfileModal;
