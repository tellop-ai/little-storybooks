-- CreateTable
CREATE TABLE "StoryProposalPage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "sceneDescription" TEXT NOT NULL,
    CONSTRAINT "StoryProposalPage_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "StoryProposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StoryProposalSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "sourceKind" TEXT NOT NULL,
    "sourceBookId" TEXT,
    "sourceCharacterId" TEXT,
    "sourceMemoryId" TEXT,
    CONSTRAINT "StoryProposalSource_id_fkey" FOREIGN KEY ("id") REFERENCES "StoryProposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StoryProposalSource_sourceBookId_fkey" FOREIGN KEY ("sourceBookId") REFERENCES "StoryBook" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StoryProposalSource_sourceCharacterId_fkey" FOREIGN KEY ("sourceCharacterId") REFERENCES "StoryCharacter" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StoryProposalSource_sourceMemoryId_fkey" FOREIGN KEY ("sourceMemoryId") REFERENCES "StoryMemory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "StoryProposalPage_ownerId_proposalId_idx" ON "StoryProposalPage"("ownerId", "proposalId");

-- CreateIndex
CREATE UNIQUE INDEX "StoryProposalPage_proposalId_position_key" ON "StoryProposalPage"("proposalId", "position");

-- CreateIndex
CREATE INDEX "StoryProposalSource_ownerId_id_idx" ON "StoryProposalSource"("ownerId", "id");
