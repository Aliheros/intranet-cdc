-- CreateTable
CREATE TABLE "SpaceSettings" (
    "id" SERIAL NOT NULL,
    "space" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpaceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SpaceSettings_space_key_key" ON "SpaceSettings"("space", "key");
