-- AGENT型Component統合マイグレーション
-- AgentConfigをComponent直下からSkillConfig配下に移動し、AGENT型Componentを廃止する

-- Step 1: AgentTeamMember.componentIdをAGENT型ComponentからWORKER SkillのComponent IDに更新
-- Agent -> Skill依存のComponentDependencyからtargetIdを特定して対応するWORKER SkillのComponentを探す
UPDATE "AgentTeamMember"
SET "componentId" = (
  SELECT cd."targetId"
  FROM "ComponentDependency" cd
  WHERE cd."sourceId" = "AgentTeamMember"."componentId"
  AND EXISTS (
    SELECT 1 FROM "Component" c
    WHERE c."id" = cd."targetId" AND c."type" = 'SKILL'
  )
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM "Component" c
  WHERE c."id" = "AgentTeamMember"."componentId" AND c."type" = 'AGENT'
);

-- AgentTeamMemberのうち、AGENT型Componentを参照していて対応するWorkerが見つからないものを削除
DELETE FROM "AgentTeamMember"
WHERE EXISTS (
  SELECT 1 FROM "Component" c
  WHERE c."id" = "AgentTeamMember"."componentId" AND c."type" = 'AGENT'
);

-- Step 2: type=AGENTのComponentに紐づくComponentDependencyレコードを削除
DELETE FROM "ComponentDependency"
WHERE "sourceId" IN (SELECT "id" FROM "Component" WHERE "type" = 'AGENT')
   OR "targetId" IN (SELECT "id" FROM "Component" WHERE "type" = 'AGENT');

-- Step 3: AgentConfigをComponentからSkillConfigベースに再作成
-- SQLiteではALTER TABLE DROP COLUMNが制限されるため、テーブル再作成で対応

-- 新しいAgentConfigテーブルを作成（skillConfigIdベース、name/description/input/output削除）
CREATE TABLE "AgentConfig_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "skillConfigId" TEXT NOT NULL,
    "model" TEXT,
    "tools" TEXT,
    "disallowedTools" TEXT,
    "permissionMode" TEXT,
    "hooks" TEXT,
    "memory" TEXT,
    "content" TEXT NOT NULL DEFAULT ''
);

-- 既存AgentConfigデータを移行（AGENT ComponentのAgentConfigをWORKER SkillのSkillConfigに紐付け）
-- Agent -> Skill依存関係からWORKER SkillのComponentを特定し、そのSkillConfigのIDを取得
INSERT INTO "AgentConfig_new" ("id", "skillConfigId", "model", "tools", "disallowedTools", "permissionMode", "hooks", "memory", "content")
SELECT
  ac."id",
  sc."id" AS "skillConfigId",
  ac."model",
  ac."tools",
  ac."disallowedTools",
  ac."permissionMode",
  ac."hooks",
  ac."memory",
  ac."content"
FROM "AgentConfig" ac
JOIN "ComponentDependency" cd ON cd."sourceId" = ac."componentId"
JOIN "Component" target_comp ON target_comp."id" = cd."targetId" AND target_comp."type" = 'SKILL'
JOIN "SkillConfig" sc ON sc."componentId" = target_comp."id";

-- 古いAgentConfigテーブルを削除して新しいテーブルにリネーム
DROP TABLE "AgentConfig";
ALTER TABLE "AgentConfig_new" RENAME TO "AgentConfig";

-- AgentConfigのユニーク制約とインデックスを作成
CREATE UNIQUE INDEX "AgentConfig_skillConfigId_key" ON "AgentConfig"("skillConfigId");

-- Step 4: type=AGENTのComponentレコードを削除
DELETE FROM "Component" WHERE "type" = 'AGENT';

-- Step 5: SkillConfigからagent/model/hooksレガシーフィールドを削除
-- SQLiteではDROP COLUMNに制限があるため、テーブル再作成で対応
CREATE TABLE "SkillConfig_new" (
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
    "content" TEXT NOT NULL DEFAULT '',
    "input" TEXT NOT NULL DEFAULT '',
    "output" TEXT NOT NULL DEFAULT ''
);

INSERT INTO "SkillConfig_new" ("id", "componentId", "name", "description", "skillType", "argumentHint", "disableModelInvocation", "userInvocable", "allowedTools", "context", "content", "input", "output")
SELECT "id", "componentId", "name", "description", "skillType", "argumentHint", "disableModelInvocation", "userInvocable", "allowedTools", "context", "content", "input", "output"
FROM "SkillConfig";

DROP TABLE "SkillConfig";
ALTER TABLE "SkillConfig_new" RENAME TO "SkillConfig";

CREATE UNIQUE INDEX "SkillConfig_componentId_key" ON "SkillConfig"("componentId");

-- Step 6: AgentConfigの外部キーを再作成（SkillConfig再作成後に参照する必要があるため）
-- SQLiteのforeign keyはテーブル作成時に定義する必要があるため、ここではインデックスのみ
-- Prismaが管理するため、外部キー制約はPrisma Clientレベルで処理される
