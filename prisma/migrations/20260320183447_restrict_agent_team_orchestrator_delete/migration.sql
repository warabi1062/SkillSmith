-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AgentTeam" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pluginId" TEXT NOT NULL,
    "orchestratorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgentTeam_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "Plugin" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgentTeam_orchestratorId_fkey" FOREIGN KEY ("orchestratorId") REFERENCES "Component" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_AgentTeam" ("createdAt", "description", "id", "name", "orchestratorId", "pluginId", "updatedAt") SELECT "createdAt", "description", "id", "name", "orchestratorId", "pluginId", "updatedAt" FROM "AgentTeam";
DROP TABLE "AgentTeam";
ALTER TABLE "new_AgentTeam" RENAME TO "AgentTeam";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
