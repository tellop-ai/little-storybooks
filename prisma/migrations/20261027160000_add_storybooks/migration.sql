-- CreateTable
CREATE TABLE "StorySettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "interfaceLanguage" TEXT NOT NULL,
    "defaultStoryLanguage" TEXT NOT NULL,
    "defaultIllustrationMode" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "StoryCharacter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "readingBand" TEXT NOT NULL,
    "interests" TEXT NOT NULL,
    "appearance" TEXT NOT NULL,
    "photoFile" TEXT,
    "displayFile" TEXT,
    "aiCopyFile" TEXT,
    "revision" INTEGER NOT NULL,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "StoryMemory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "photoFile" TEXT,
    "displayFile" TEXT,
    "aiCopyFile" TEXT,
    "revision" INTEGER NOT NULL,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "StoryBook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "primaryCharacterName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "activeEditionId" TEXT,
    "revision" INTEGER NOT NULL,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "StoryEdition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "editionNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "readingBand" TEXT NOT NULL,
    "sourceKind" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "sourceText" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "charactersJson" TEXT NOT NULL,
    "memoriesJson" TEXT NOT NULL,
    "illustrationMode" TEXT NOT NULL,
    "styleKey" TEXT NOT NULL,
    "characterGuide" TEXT NOT NULL,
    "storyline" TEXT NOT NULL,
    "dedication" TEXT NOT NULL,
    "pageCount" INTEGER NOT NULL,
    "coverFile" TEXT,
    "coverKind" TEXT NOT NULL,
    "coverDescription" TEXT NOT NULL,
    "aiText" BOOLEAN NOT NULL,
    "reviewedAt" TEXT,
    "revision" INTEGER NOT NULL,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,
    CONSTRAINT "StoryEdition_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "StoryBook" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StoryReference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "characterName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sourceFile" TEXT,
    "referenceFile" TEXT,
    "createdAt" TEXT NOT NULL,
    CONSTRAINT "StoryReference_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "StoryEdition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StoryPage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "sceneDescription" TEXT NOT NULL,
    "pictureFile" TEXT,
    "pictureKind" TEXT NOT NULL,
    "pictureAlt" TEXT NOT NULL,
    "aiText" BOOLEAN NOT NULL,
    "aiPicture" BOOLEAN NOT NULL,
    "revision" INTEGER NOT NULL,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,
    CONSTRAINT "StoryPage_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "StoryEdition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StoryReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "resultJson" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "StoryAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "file" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "StoryProposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "bookId" TEXT,
    "editionId" TEXT,
    "pagePosition" INTEGER,
    "expectedRevision" INTEGER NOT NULL,
    "contentJson" TEXT NOT NULL,
    "pictureFile" TEXT,
    "problem" TEXT,
    "createdAt" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "StorySettings_ownerId_key" ON "StorySettings"("ownerId");

-- CreateIndex
CREATE INDEX "StoryCharacter_ownerId_id_idx" ON "StoryCharacter"("ownerId", "id");

-- CreateIndex
CREATE INDEX "StoryCharacter_ownerId_updatedAt_id_idx" ON "StoryCharacter"("ownerId", "updatedAt", "id");

-- CreateIndex
CREATE INDEX "StoryMemory_ownerId_id_idx" ON "StoryMemory"("ownerId", "id");

-- CreateIndex
CREATE INDEX "StoryMemory_ownerId_updatedAt_id_idx" ON "StoryMemory"("ownerId", "updatedAt", "id");

-- CreateIndex
CREATE INDEX "StoryBook_ownerId_id_idx" ON "StoryBook"("ownerId", "id");

-- CreateIndex
CREATE INDEX "StoryBook_ownerId_updatedAt_id_idx" ON "StoryBook"("ownerId", "updatedAt", "id");

-- CreateIndex
CREATE INDEX "StoryEdition_ownerId_bookId_idx" ON "StoryEdition"("ownerId", "bookId");

-- CreateIndex
CREATE UNIQUE INDEX "StoryEdition_bookId_editionNumber_key" ON "StoryEdition"("bookId", "editionNumber");

-- CreateIndex
CREATE INDEX "StoryReference_ownerId_editionId_idx" ON "StoryReference"("ownerId", "editionId");

-- CreateIndex
CREATE UNIQUE INDEX "StoryReference_editionId_position_key" ON "StoryReference"("editionId", "position");

-- CreateIndex
CREATE INDEX "StoryPage_ownerId_editionId_idx" ON "StoryPage"("ownerId", "editionId");

-- CreateIndex
CREATE UNIQUE INDEX "StoryPage_editionId_position_key" ON "StoryPage"("editionId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "StoryReceipt_ownerId_requestId_key" ON "StoryReceipt"("ownerId", "requestId");

-- CreateIndex
CREATE UNIQUE INDEX "StoryAsset_ownerId_file_key" ON "StoryAsset"("ownerId", "file");

-- CreateIndex
CREATE INDEX "StoryProposal_ownerId_id_idx" ON "StoryProposal"("ownerId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "StoryProposal_ownerId_requestId_key" ON "StoryProposal"("ownerId", "requestId");
