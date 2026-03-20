/*
  Warnings:

  - Added the required column `updatedAt` to the `Plugin` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Component" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pluginId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Component_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "Plugin" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SkillConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "componentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "skillType" TEXT NOT NULL,
    "argumentHint" TEXT,
    "disableModelInvocation" BOOLEAN NOT NULL DEFAULT false,
    "userInvocable" BOOLEAN NOT NULL DEFAULT true,
    "allowedTools" TEXT,
    "context" TEXT,
    "agent" TEXT,
    "model" TEXT,
    "hooks" TEXT,
    CONSTRAINT "SkillConfig_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "componentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "model" TEXT,
    "tools" TEXT,
    "disallowedTools" TEXT,
    "permissionMode" TEXT,
    "hooks" TEXT,
    "memory" TEXT,
    CONSTRAINT "AgentConfig_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ComponentFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "componentId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ComponentFile_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ComponentDependency" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ComponentDependency_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Component" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ComponentDependency_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Component" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Plugin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Plugin" ("createdAt", "id", "name") SELECT "createdAt", "id", "name" FROM "Plugin";
DROP TABLE "Plugin";
ALTER TABLE "new_Plugin" RENAME TO "Plugin";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "SkillConfig_componentId_key" ON "SkillConfig"("componentId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentConfig_componentId_key" ON "AgentConfig"("componentId");

-- CreateIndex
CREATE UNIQUE INDEX "ComponentFile_componentId_filename_key" ON "ComponentFile"("componentId", "filename");

-- CreateIndex
CREATE UNIQUE INDEX "ComponentDependency_sourceId_targetId_key" ON "ComponentDependency"("sourceId", "targetId");
