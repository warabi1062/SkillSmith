-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AgentConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "skillConfigId" TEXT NOT NULL,
    "model" TEXT,
    "tools" TEXT,
    "content" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "AgentConfig_skillConfigId_fkey" FOREIGN KEY ("skillConfigId") REFERENCES "SkillConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AgentConfig" ("content", "id", "model", "skillConfigId", "tools") SELECT "content", "id", "model", "skillConfigId", "tools" FROM "AgentConfig";
DROP TABLE "AgentConfig";
ALTER TABLE "new_AgentConfig" RENAME TO "AgentConfig";
CREATE UNIQUE INDEX "AgentConfig_skillConfigId_key" ON "AgentConfig"("skillConfigId");
CREATE TABLE "new_SkillConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "componentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "skillType" TEXT NOT NULL,
    "argumentHint" TEXT,
    "disableModelInvocation" BOOLEAN NOT NULL DEFAULT false,
    "allowedTools" TEXT,
    "content" TEXT NOT NULL DEFAULT '',
    "input" TEXT NOT NULL DEFAULT '',
    "output" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "SkillConfig_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SkillConfig" ("allowedTools", "argumentHint", "componentId", "content", "description", "disableModelInvocation", "id", "input", "name", "output", "skillType") SELECT "allowedTools", "argumentHint", "componentId", "content", "description", "disableModelInvocation", "id", "input", "name", "output", "skillType" FROM "SkillConfig";
DROP TABLE "SkillConfig";
ALTER TABLE "new_SkillConfig" RENAME TO "SkillConfig";
CREATE UNIQUE INDEX "SkillConfig_componentId_key" ON "SkillConfig"("componentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
