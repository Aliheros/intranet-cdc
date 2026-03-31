-- AlterTable
ALTER TABLE "User" ADD COLUMN     "telephone" TEXT,
ADD COLUMN     "profileVolontaire" JSONB,
ADD COLUMN     "commentairesRH" JSONB NOT NULL DEFAULT '[]';
