-- Migration: soft_delete_and_audit
-- Objectif : remplacer la suppression physique des utilisateurs par un soft delete,
--            corriger la contrainte RESTRICT sur Hour, ajouter une table d'audit immuable.

-- ── 1. Soft delete sur User ──────────────────────────────────────────────────
ALTER TABLE "User"
  ADD COLUMN "isDeleted"    BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN "deletedAt"    TIMESTAMP(3),
  ADD COLUMN "deletedBy"    INTEGER,
  ADD COLUMN "deleteReason" TEXT;

-- ── 2. Hour : userId devient nullable + snapshot du nom ──────────────────────
-- 2a. Ajouter la colonne snapshot AVANT de toucher à la FK
ALTER TABLE "Hour"
  ADD COLUMN "userNomSnapshot" TEXT NOT NULL DEFAULT '';

-- 2b. Remplir le snapshot pour toutes les lignes existantes
UPDATE "Hour" h
  SET "userNomSnapshot" = u."nom"
  FROM "User" u
  WHERE h."userId" = u."id";

-- 2c. Rendre userId nullable (nécessaire pour SET NULL)
ALTER TABLE "Hour"
  ALTER COLUMN "userId" DROP NOT NULL;

-- 2d. Remplacer la contrainte RESTRICT par SET NULL
ALTER TABLE "Hour"
  DROP CONSTRAINT "Hour_userId_fkey";

ALTER TABLE "Hour"
  ADD CONSTRAINT "Hour_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 3. Table d'audit immuable ─────────────────────────────────────────────────
CREATE TABLE "AuditLog" (
  "id"         SERIAL        NOT NULL,
  "actorId"    INTEGER,
  "actorNom"   TEXT          NOT NULL,
  "action"     TEXT          NOT NULL,
  "targetId"   INTEGER,
  "targetType" TEXT          NOT NULL,
  "targetNom"  TEXT,
  "payload"    JSONB,
  "ip"         TEXT,
  "createdAt"  TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- Index pour les recherches par acteur ou par cible
CREATE INDEX "AuditLog_actorId_idx"    ON "AuditLog"("actorId");
CREATE INDEX "AuditLog_targetId_idx"   ON "AuditLog"("targetId", "targetType");
CREATE INDEX "AuditLog_action_idx"     ON "AuditLog"("action");
CREATE INDEX "AuditLog_createdAt_idx"  ON "AuditLog"("createdAt" DESC);
