-- SkillType enum拡張: WORKER_WITH_SUB_AGENT, WORKER_WITH_AGENT_TEAM を追加
-- SQLiteではenumはテキストカラムのため、新しい値は自動的に受け入れられる。
-- 既存のWORKER + agentConfig有りのデータをWORKER_WITH_SUB_AGENTに移行する。

-- 1. 既存のWORKER SkillでagentConfigを持つものをWORKER_WITH_SUB_AGENTに変更
UPDATE "SkillConfig"
SET "skillType" = 'WORKER_WITH_SUB_AGENT'
WHERE "skillType" = 'WORKER'
  AND "id" IN (
    SELECT "skillConfigId" FROM "AgentConfig"
  );

-- 2. AgentTeamMemberテーブルを再作成（teamId -> agentTeamComponentId）
-- まず既存データを一時テーブルに退避
CREATE TABLE "_AgentTeamMember_backup" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "teamId" TEXT NOT NULL,
  "componentId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0
);

INSERT INTO "_AgentTeamMember_backup" SELECT "id", "teamId", "componentId", "sortOrder" FROM "AgentTeamMember";

-- 既存テーブルを削除
DROP TABLE "AgentTeamMember";

-- 新しいスキーマでテーブルを作成
CREATE TABLE "AgentTeamMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentTeamComponentId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "AgentTeamMember_agentTeamComponentId_fkey" FOREIGN KEY ("agentTeamComponentId") REFERENCES "Component" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgentTeamMember_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AgentTeamMember_agentTeamComponentId_componentId_key" ON "AgentTeamMember"("agentTeamComponentId", "componentId");

-- 注: 既存のAgentTeamMemberデータはAgentTeamテーブルに紐づいているため、
-- 新しいスキーマ（Component紐づけ）には直接移行できない。
-- 開発環境のデータが少ないため、既存メンバーデータは破棄する。

-- 一時テーブルを削除
DROP TABLE "_AgentTeamMember_backup";

-- 3. AgentTeamテーブルを削除
DROP TABLE "AgentTeam";
