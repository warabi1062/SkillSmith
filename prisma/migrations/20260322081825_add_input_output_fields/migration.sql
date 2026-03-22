/*
  Warnings:

  - You are about to drop the `OutputSchemaField` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "OutputSchemaField_componentFileId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "OutputSchemaField";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AgentConfig" (
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
    "content" TEXT NOT NULL DEFAULT '',
    "input" TEXT NOT NULL DEFAULT '',
    "output" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "AgentConfig_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AgentConfig" ("componentId", "content", "description", "disallowedTools", "hooks", "id", "memory", "model", "name", "permissionMode", "tools") SELECT "componentId", "content", "description", "disallowedTools", "hooks", "id", "memory", "model", "name", "permissionMode", "tools" FROM "AgentConfig";
DROP TABLE "AgentConfig";
ALTER TABLE "new_AgentConfig" RENAME TO "AgentConfig";
CREATE UNIQUE INDEX "AgentConfig_componentId_key" ON "AgentConfig"("componentId");
CREATE TABLE "new_SkillConfig" (
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
    "content" TEXT NOT NULL DEFAULT '',
    "input" TEXT NOT NULL DEFAULT '',
    "output" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "SkillConfig_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SkillConfig" ("agent", "allowedTools", "argumentHint", "componentId", "content", "context", "description", "disableModelInvocation", "hooks", "id", "model", "name", "skillType", "userInvocable") SELECT "agent", "allowedTools", "argumentHint", "componentId", "content", "context", "description", "disableModelInvocation", "hooks", "id", "model", "name", "skillType", "userInvocable" FROM "SkillConfig";
DROP TABLE "SkillConfig";
ALTER TABLE "new_SkillConfig" RENAME TO "SkillConfig";
CREATE UNIQUE INDEX "SkillConfig_componentId_key" ON "SkillConfig"("componentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
