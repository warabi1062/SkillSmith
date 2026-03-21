/*
  Warnings:

  - You are about to drop the column `parentId` on the `OutputSchemaField` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OutputSchemaField" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "componentFileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "description" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "enumValues" TEXT,
    "placeholder" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OutputSchemaField_componentFileId_fkey" FOREIGN KEY ("componentFileId") REFERENCES "ComponentFile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_OutputSchemaField" ("componentFileId", "createdAt", "description", "enumValues", "fieldType", "id", "name", "placeholder", "required", "sortOrder", "updatedAt") SELECT "componentFileId", "createdAt", "description", "enumValues", "fieldType", "id", "name", "placeholder", "required", "sortOrder", "updatedAt" FROM "OutputSchemaField";
DROP TABLE "OutputSchemaField";
ALTER TABLE "new_OutputSchemaField" RENAME TO "OutputSchemaField";
CREATE INDEX "OutputSchemaField_componentFileId_idx" ON "OutputSchemaField"("componentFileId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
