-- CreateTable
CREATE TABLE "OutputSchemaField" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "componentFileId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "description" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "enumValues" TEXT,
    "placeholder" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OutputSchemaField_componentFileId_fkey" FOREIGN KEY ("componentFileId") REFERENCES "ComponentFile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OutputSchemaField_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "OutputSchemaField" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "OutputSchemaField_componentFileId_idx" ON "OutputSchemaField"("componentFileId");

-- CreateIndex
CREATE INDEX "OutputSchemaField_parentId_idx" ON "OutputSchemaField"("parentId");
