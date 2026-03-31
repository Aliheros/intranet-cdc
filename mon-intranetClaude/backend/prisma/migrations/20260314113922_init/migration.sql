-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "avatar" TEXT NOT NULL,
    "pole" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'Actif',
    "dateInscription" TEXT,
    "competences" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dispos" TEXT,
    "notesRH" TEXT,
    "projets" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "pole" TEXT NOT NULL,
    "level" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Action" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "etablissement" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "contact_nom" TEXT,
    "contact_email" TEXT,
    "contact_tel" TEXT,
    "date_debut" TEXT NOT NULL,
    "date_fin" TEXT NOT NULL,
    "cycle" TEXT NOT NULL,
    "responsables" TEXT[],
    "statut" TEXT NOT NULL,
    "notes" TEXT,
    "projet" TEXT,
    "beneficiaires" INTEGER NOT NULL DEFAULT 0,
    "type_classe" TEXT,
    "heures" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "budgetPrevisionnel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "depensesReelles" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "transactionId" INTEGER,
    "polesNotifies" TEXT[],
    "checklist" JSONB,
    "bilan" JSONB,
    "timeline" JSONB NOT NULL DEFAULT '[]',
    "completionScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Action_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evenement" (
    "id" SERIAL NOT NULL,
    "titre" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "cycle" TEXT NOT NULL,
    "lieu" TEXT,
    "actionId" INTEGER,
    "description" TEXT,
    "poles" TEXT[],
    "projet" TEXT,
    "equipe" TEXT[],
    "fichiers" JSONB NOT NULL DEFAULT '[]',
    "statut" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "whatsappLink" TEXT,
    "seances" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evenement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" SERIAL NOT NULL,
    "space" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "description" TEXT,
    "assignees" JSONB NOT NULL DEFAULT '[]',
    "createdBy" TEXT NOT NULL,
    "lockedBy" TEXT,
    "forceCompletedBy" TEXT,
    "deadline" TEXT,
    "cycle" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "completedAt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskRequest" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "description" TEXT,
    "space" TEXT NOT NULL,
    "actionId" INTEGER,
    "requestedBy" TEXT NOT NULL,
    "assignees" JSONB NOT NULL DEFAULT '[]',
    "targetPool" JSONB NOT NULL DEFAULT '[]',
    "deadline" TEXT,
    "cycle" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" SERIAL NOT NULL,
    "date" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "imputation" TEXT NOT NULL,
    "statut" TEXT NOT NULL,
    "fichiers" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" SERIAL NOT NULL,
    "pole" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mission" (
    "id" SERIAL NOT NULL,
    "titre" TEXT NOT NULL,
    "pole" TEXT NOT NULL,
    "projet" TEXT,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "competences" TEXT[],
    "duree" TEXT,
    "urgence" TEXT NOT NULL,
    "statut" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "linkedActionId" INTEGER,
    "responsable" TEXT,
    "dateDebut" TEXT,
    "dateFin" TEXT,
    "candidatures" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoteFrais" (
    "id" SERIAL NOT NULL,
    "numeroDossier" TEXT NOT NULL,
    "demandeurId" INTEGER,
    "demandeurNom" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "justificatif" TEXT,
    "projet" TEXT,
    "pole" TEXT,
    "linkedActionId" INTEGER,
    "statut" TEXT NOT NULL,
    "commentaireTresorerie" TEXT,
    "transactionId" INTEGER,
    "historique" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoteFrais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "titre" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "auteur" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "cible" TEXT NOT NULL,
    "targetPoles" TEXT[],
    "targetUsers" TEXT[],
    "lu" TEXT[],
    "priorite" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hour" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "actionId" INTEGER,
    "eventId" INTEGER,
    "type" TEXT NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "date" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" SERIAL NOT NULL,
    "titre" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "membres" TEXT[],
    "isTrashed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "auteurId" INTEGER,
    "auteurNom" TEXT NOT NULL,
    "auteurAvatar" TEXT NOT NULL,
    "auteurPole" TEXT,
    "texte" TEXT NOT NULL,
    "heure" TEXT NOT NULL,
    "fichiers" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpaceChat" (
    "id" SERIAL NOT NULL,
    "space" TEXT NOT NULL,
    "auteur" TEXT NOT NULL,
    "avatar" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "heure" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpaceChat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_userId_pole_key" ON "Permission"("userId", "pole");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_pole_key" ON "Budget"("pole");

-- CreateIndex
CREATE UNIQUE INDEX "NoteFrais_numeroDossier_key" ON "NoteFrais"("numeroDossier");

-- AddForeignKey
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteFrais" ADD CONSTRAINT "NoteFrais_demandeurId_fkey" FOREIGN KEY ("demandeurId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hour" ADD CONSTRAINT "Hour_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
