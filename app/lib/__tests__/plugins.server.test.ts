import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "../../generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { execSync } from "node:child_process";
import path from "node:path";

// --- Setup test DB ---

const TEST_DB_PATH = path.resolve(
  import.meta.dirname,
  "../../../prisma/test.db",
);
const TEST_DB_URL = `file:${TEST_DB_PATH}`;

const adapter = new PrismaBetterSqlite3({ url: TEST_DB_URL });
const testPrisma = new PrismaClient({ adapter });

// Mock db.server to inject test Prisma client
vi.mock("../db.server", () => ({
  prisma: testPrisma,
}));

// Mock audit-log to suppress console output
vi.mock("../audit-log.server", () => ({
  logAuditEvent: vi.fn(),
}));

// Import after mocks
const {
  createPlugin,
  getPlugins,
  getPlugin,
  updatePlugin,
  deletePlugin,
  createComponent,
  getComponent,
  updateComponent,
  deleteComponent,
  addAgentTeamMember,
  removeAgentTeamMember,
  createComponentFile,
  getComponentFile,
  updateComponentFile,
  deleteComponentFile,
  createDependency,
  getDependency,
  deleteDependency,
  reorderDependency,
  verifyDependenciesOwnership,
  deleteDependenciesBatch,
} = await import("../plugins.server");

const { ValidationError } = await import("../validations");

// --- Helpers ---

async function cleanDatabase() {
  await testPrisma.componentFile.deleteMany();
  await testPrisma.componentDependency.deleteMany();
  await testPrisma.agentTeamMember.deleteMany();
  await testPrisma.agentConfig.deleteMany();
  await testPrisma.skillConfig.deleteMany();
  await testPrisma.component.deleteMany();
  await testPrisma.plugin.deleteMany();
}

// --- Test suite ---

beforeAll(() => {
  execSync(`npx prisma migrate deploy`, {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    cwd: path.resolve(import.meta.dirname, "../../.."),
    stdio: "pipe",
  });
});

beforeEach(async () => {
  await cleanDatabase();
});

describe("plugins.server", () => {
  // ============================
  // Plugin CRUD
  // ============================
  describe("Plugin CRUD", () => {
    it("createPlugin: creates a plugin", async () => {
      const plugin = await createPlugin({
        name: "Test Plugin",
        description: "A test plugin",
      });

      expect(plugin.id).toBeDefined();
      expect(plugin.name).toBe("Test Plugin");
      expect(plugin.description).toBe("A test plugin");
    });

    it("getPlugins: returns created plugins", async () => {
      await createPlugin({ name: "Plugin A" });
      await createPlugin({ name: "Plugin B" });

      const plugins = await getPlugins();

      expect(plugins.length).toBe(2);
      const names = plugins.map((p) => p.name);
      expect(names).toContain("Plugin A");
      expect(names).toContain("Plugin B");
    });

    it("getPlugin: returns plugin with includes", async () => {
      const created = await createPlugin({ name: "Detail Plugin" });

      const plugin = await getPlugin(created.id);

      expect(plugin).not.toBeNull();
      expect(plugin!.name).toBe("Detail Plugin");
      expect(plugin!.components).toBeDefined();
    });

    it("updatePlugin: updates name and description", async () => {
      const created = await createPlugin({ name: "Old Name" });

      const updated = await updatePlugin(created.id, {
        name: "New Name",
        description: "New desc",
      });

      expect(updated.name).toBe("New Name");
      expect(updated.description).toBe("New desc");
    });

    it("deletePlugin: plugin becomes null after deletion", async () => {
      const created = await createPlugin({ name: "To Delete" });

      await deletePlugin(created.id);

      const result = await getPlugin(created.id);
      expect(result).toBeNull();
    });
  });

  // ============================
  // Component CRUD
  // ============================
  describe("Component CRUD", () => {
    it("createComponent(SKILL): creates with skillConfig", async () => {
      const plugin = await createPlugin({ name: "P" });

      const component = await createComponent(plugin.id, {
        type: "SKILL",
        name: "my-skill",
        skillType: "ENTRY_POINT",
        description: "A skill",
      });

      expect(component.type).toBe("SKILL");
      expect(component.skillConfig).not.toBeNull();
      expect(component.skillConfig!.name).toBe("my-skill");
      expect(component.skillConfig!.skillType).toBe("ENTRY_POINT");
    });

    it("createComponent(WORKER): creates with skillConfig but no agentConfig", async () => {
      const plugin = await createPlugin({ name: "P" });

      const component = await createComponent(plugin.id, {
        type: "SKILL",
        name: "my-worker",
        skillType: "WORKER",
        description: "A worker",
      });

      expect(component.type).toBe("SKILL");
      expect(component.skillConfig).not.toBeNull();
      expect(component.skillConfig!.name).toBe("my-worker");
      // WORKERではagentConfigは自動作成されない
      expect(component.skillConfig!.agentConfig).toBeNull();
    });

    it("createComponent(WORKER_WITH_SUB_AGENT): creates with agentConfig", async () => {
      const plugin = await createPlugin({ name: "P" });

      const component = await createComponent(plugin.id, {
        type: "SKILL",
        name: "my-agent-worker",
        skillType: "WORKER_WITH_SUB_AGENT",
      });

      expect(component.skillConfig!.skillType).toBe("WORKER_WITH_SUB_AGENT");
      expect(component.skillConfig!.agentConfig).not.toBeNull();
    });

    it("createComponent(WORKER_WITH_AGENT_TEAM): creates without agentConfig", async () => {
      const plugin = await createPlugin({ name: "P" });

      const component = await createComponent(plugin.id, {
        type: "SKILL",
        name: "my-team-worker",
        skillType: "WORKER_WITH_AGENT_TEAM",
      });

      expect(component.skillConfig!.skillType).toBe("WORKER_WITH_AGENT_TEAM");
      expect(component.skillConfig!.agentConfig).toBeNull();
    });

    it("getComponent: returns component with includes", async () => {
      const plugin = await createPlugin({ name: "P" });
      const created = await createComponent(plugin.id, {
        type: "SKILL",
        name: "s",
        skillType: "WORKER_WITH_SUB_AGENT",
      });

      const component = await getComponent(created.id);

      expect(component).not.toBeNull();
      expect(component!.skillConfig).not.toBeNull();
      expect(component!.files).toBeDefined();
    });

    it("updateComponent: updates name and description", async () => {
      const plugin = await createPlugin({ name: "P" });
      const created = await createComponent(plugin.id, {
        type: "SKILL",
        name: "old",
        skillType: "WORKER",
      });

      const updated = await updateComponent(created.id, {
        type: "SKILL",
        name: "new-name",
        skillType: "ENTRY_POINT",
        description: "updated desc",
      });

      expect(updated.skillConfig!.name).toBe("new-name");
      expect(updated.skillConfig!.skillType).toBe("ENTRY_POINT");
      expect(updated.skillConfig!.description).toBe("updated desc");
    });

    it("updateComponent: skillType変更 WORKER -> WORKER_WITH_SUB_AGENT でagentConfigが自動作成される", async () => {
      const plugin = await createPlugin({ name: "P" });
      const created = await createComponent(plugin.id, {
        type: "SKILL",
        name: "w",
        skillType: "WORKER",
      });

      // WORKERにはagentConfigがない
      expect(created.skillConfig!.agentConfig).toBeNull();

      const updated = await updateComponent(created.id, {
        type: "SKILL",
        name: "w",
        skillType: "WORKER_WITH_SUB_AGENT",
      });

      expect(updated.skillConfig!.skillType).toBe("WORKER_WITH_SUB_AGENT");
      expect(updated.skillConfig!.agentConfig).not.toBeNull();
    });

    it("updateComponent: skillType変更 WORKER_WITH_SUB_AGENT -> WORKER でagentConfigが自動削除される", async () => {
      const plugin = await createPlugin({ name: "P" });
      const created = await createComponent(plugin.id, {
        type: "SKILL",
        name: "w",
        skillType: "WORKER_WITH_SUB_AGENT",
      });

      // WORKER_WITH_SUB_AGENTにはagentConfigがある
      expect(created.skillConfig!.agentConfig).not.toBeNull();

      const updated = await updateComponent(created.id, {
        type: "SKILL",
        name: "w",
        skillType: "WORKER",
      });

      expect(updated.skillConfig!.skillType).toBe("WORKER");
      expect(updated.skillConfig!.agentConfig).toBeNull();
    });

    it("deleteComponent: successfully deletes", async () => {
      const plugin = await createPlugin({ name: "P" });
      const created = await createComponent(plugin.id, {
        type: "SKILL",
        name: "to-delete",
        skillType: "WORKER",
      });

      await deleteComponent(created.id);

      const result = await getComponent(created.id);
      expect(result).toBeNull();
    });
  });

  // ============================
  // AgentTeamMember CRUD
  // ============================
  describe("AgentTeamMember CRUD", () => {
    it("addAgentTeamMember: adds a WORKER_WITH_SUB_AGENT member", async () => {
      const plugin = await createPlugin({ name: "P" });
      const agentTeam = await createComponent(plugin.id, {
        type: "SKILL",
        name: "team",
        skillType: "WORKER_WITH_AGENT_TEAM",
      });
      const worker = await createComponent(plugin.id, {
        type: "SKILL",
        name: "worker",
        skillType: "WORKER_WITH_SUB_AGENT",
      });

      const member = await addAgentTeamMember(agentTeam.id, {
        memberComponentId: worker.id,
      });

      expect(member.agentTeamComponentId).toBe(agentTeam.id);
      expect(member.componentId).toBe(worker.id);
    });

    it("addAgentTeamMember: throws DUPLICATE_MEMBER on duplicate", async () => {
      const plugin = await createPlugin({ name: "P" });
      const agentTeam = await createComponent(plugin.id, {
        type: "SKILL",
        name: "team",
        skillType: "WORKER_WITH_AGENT_TEAM",
      });
      const worker = await createComponent(plugin.id, {
        type: "SKILL",
        name: "worker",
        skillType: "WORKER_WITH_SUB_AGENT",
      });

      await addAgentTeamMember(agentTeam.id, { memberComponentId: worker.id });

      await expect(
        addAgentTeamMember(agentTeam.id, { memberComponentId: worker.id }),
      ).rejects.toThrow(ValidationError);
    });

    it("addAgentTeamMember: throws INVALID_COMPONENT_TYPE for WORKER skill", async () => {
      const plugin = await createPlugin({ name: "P" });
      const agentTeam = await createComponent(plugin.id, {
        type: "SKILL",
        name: "team",
        skillType: "WORKER_WITH_AGENT_TEAM",
      });
      const worker = await createComponent(plugin.id, {
        type: "SKILL",
        name: "worker",
        skillType: "WORKER",
      });

      await expect(
        addAgentTeamMember(agentTeam.id, { memberComponentId: worker.id }),
      ).rejects.toThrow(ValidationError);
    });

    it("removeAgentTeamMember: removes a member", async () => {
      const plugin = await createPlugin({ name: "P" });
      const agentTeam = await createComponent(plugin.id, {
        type: "SKILL",
        name: "team",
        skillType: "WORKER_WITH_AGENT_TEAM",
      });
      const worker = await createComponent(plugin.id, {
        type: "SKILL",
        name: "worker",
        skillType: "WORKER_WITH_SUB_AGENT",
      });
      const member = await addAgentTeamMember(agentTeam.id, {
        memberComponentId: worker.id,
      });

      await removeAgentTeamMember(member.id, agentTeam.id);

      const members = await testPrisma.agentTeamMember.findMany({
        where: { agentTeamComponentId: agentTeam.id },
      });
      expect(members.length).toBe(0);
    });

    it("removeAgentTeamMember: rejects if member does not belong to specified team", async () => {
      const plugin = await createPlugin({ name: "P" });
      const agentTeam1 = await createComponent(plugin.id, {
        type: "SKILL",
        name: "team1",
        skillType: "WORKER_WITH_AGENT_TEAM",
      });
      const agentTeam2 = await createComponent(plugin.id, {
        type: "SKILL",
        name: "team2",
        skillType: "WORKER_WITH_AGENT_TEAM",
      });
      const worker = await createComponent(plugin.id, {
        type: "SKILL",
        name: "worker",
        skillType: "WORKER_WITH_SUB_AGENT",
      });
      const member = await addAgentTeamMember(agentTeam1.id, {
        memberComponentId: worker.id,
      });

      // agentTeam2のIDを渡しても、memberはagentTeam1に属するのでエラー
      await expect(
        removeAgentTeamMember(member.id, agentTeam2.id),
      ).rejects.toThrow(
        "Member does not belong to the specified agent team component",
      );
    });
  });

  // ============================
  // ComponentFile CRUD
  // ============================
  describe("ComponentFile CRUD", () => {
    it("createComponentFile: creates a file", async () => {
      const plugin = await createPlugin({ name: "P" });
      const component = await createComponent(plugin.id, {
        type: "SKILL",
        name: "s",
        skillType: "WORKER",
      });

      const file = await createComponentFile(component.id, {
        role: "TEMPLATE",
        filename: "template.md",
        content: "# Content",
      });

      expect(file.id).toBeDefined();
      expect(file.filename).toBe("template.md");
      expect(file.role).toBe("TEMPLATE");
    });

    it("createComponentFile: throws DUPLICATE_FILENAME on duplicate", async () => {
      const plugin = await createPlugin({ name: "P" });
      const component = await createComponent(plugin.id, {
        type: "SKILL",
        name: "s",
        skillType: "WORKER",
      });

      await createComponentFile(component.id, {
        role: "TEMPLATE",
        filename: "template.md",
        content: "# A",
      });

      await expect(
        createComponentFile(component.id, {
          role: "REFERENCE",
          filename: "template.md",
          content: "# B",
        }),
      ).rejects.toThrow(ValidationError);
    });

    it("updateComponentFile: updates filename and content", async () => {
      const plugin = await createPlugin({ name: "P" });
      const component = await createComponent(plugin.id, {
        type: "SKILL",
        name: "s",
        skillType: "WORKER",
      });
      const file = await createComponentFile(component.id, {
        role: "TEMPLATE",
        filename: "template.md",
        content: "old",
      });

      const updated = await updateComponentFile(file.id, {
        filename: "new-template.md",
        content: "new content",
      });

      expect(updated.filename).toBe("new-template.md");
      expect(updated.content).toBe("new content");
    });

    it("updateComponentFile: throws FILE_NOT_FOUND for non-existent file", async () => {
      await expect(
        updateComponentFile("non-existent-id", {
          filename: "f.md",
          content: "",
        }),
      ).rejects.toThrow(ValidationError);
    });

    it("deleteComponentFile: deletes a file", async () => {
      const plugin = await createPlugin({ name: "P" });
      const component = await createComponent(plugin.id, {
        type: "SKILL",
        name: "s",
        skillType: "WORKER",
      });
      const file = await createComponentFile(component.id, {
        role: "REFERENCE",
        filename: "ref.md",
        content: "ref",
      });

      await deleteComponentFile(file.id);

      const result = await getComponentFile(file.id);
      expect(result).toBeNull();
    });
  });

  // ============================
  // updateComponent: input/output フィールド
  // ============================
  describe("updateComponent input/output", () => {
    it("updateComponent(SKILL): input/outputが保存・取得できる", async () => {
      const plugin = await createPlugin({ name: "P" });
      const created = await createComponent(plugin.id, {
        type: "SKILL",
        name: "s",
        skillType: "WORKER",
      });

      const updated = await updateComponent(created.id, {
        type: "SKILL",
        name: "s",
        skillType: "WORKER",
        input: "- タスクID\n- ファイルパス",
        output: "- 実装結果のパス",
      });

      expect(updated.skillConfig!.input).toBe("- タスクID\n- ファイルパス");
      expect(updated.skillConfig!.output).toBe("- 実装結果のパス");
    });

    it("updateComponent(WORKER_WITH_SUB_AGENT): agentConfigの更新ができる", async () => {
      const plugin = await createPlugin({ name: "P" });
      const created = await createComponent(plugin.id, {
        type: "SKILL",
        name: "w",
        skillType: "WORKER_WITH_SUB_AGENT",
      });

      const updated = await updateComponent(created.id, {
        type: "SKILL",
        name: "w",
        skillType: "WORKER_WITH_SUB_AGENT",
        agentConfig: {
          model: "sonnet",
          content: "# Agent body",
        },
      });

      expect(updated.skillConfig!.agentConfig!.model).toBe("sonnet");
      expect(updated.skillConfig!.agentConfig!.content).toBe("# Agent body");
    });

    it("updateComponent: input/outputが未指定の場合は既存値が保持される", async () => {
      const plugin = await createPlugin({ name: "P" });
      const created = await createComponent(plugin.id, {
        type: "SKILL",
        name: "s",
        skillType: "WORKER",
      });

      // まずinput/outputを設定
      await updateComponent(created.id, {
        type: "SKILL",
        name: "s",
        skillType: "WORKER",
        input: "existing input",
        output: "existing output",
      });

      // input/output未指定で更新
      const updated = await updateComponent(created.id, {
        type: "SKILL",
        name: "s-updated",
        skillType: "WORKER",
      });

      expect(updated.skillConfig!.input).toBe("existing input");
      expect(updated.skillConfig!.output).toBe("existing output");
    });

    it("createComponent: input/outputのデフォルト値は空文字列", async () => {
      const plugin = await createPlugin({ name: "P" });
      const created = await createComponent(plugin.id, {
        type: "SKILL",
        name: "s",
        skillType: "WORKER",
      });

      expect(created.skillConfig!.input).toBe("");
      expect(created.skillConfig!.output).toBe("");
    });
  });

  // ============================
  // ComponentDependency CRUD
  // ============================
  describe("ComponentDependency CRUD", () => {
    async function createTwoComponents() {
      const plugin = await createPlugin({ name: "P" });
      const source = await createComponent(plugin.id, {
        type: "SKILL",
        name: "source",
        skillType: "ENTRY_POINT",
      });
      const target = await createComponent(plugin.id, {
        type: "SKILL",
        name: "target",
        skillType: "WORKER",
      });
      return { plugin, source, target };
    }

    it("createDependency: creates with auto order", async () => {
      const { source, target } = await createTwoComponents();

      const dep = await createDependency({
        sourceId: source.id,
        targetId: target.id,
      });

      expect(dep.id).toBeDefined();
      expect(dep.sourceId).toBe(source.id);
      expect(dep.targetId).toBe(target.id);
      expect(dep.order).toBe(0);
    });

    it("createDependency: throws DUPLICATE_DEPENDENCY on duplicate", async () => {
      const { source, target } = await createTwoComponents();

      await createDependency({
        sourceId: source.id,
        targetId: target.id,
      });

      await expect(
        createDependency({
          sourceId: source.id,
          targetId: target.id,
        }),
      ).rejects.toThrow(ValidationError);
    });

    it("getDependency: returns with source and target", async () => {
      const { source, target } = await createTwoComponents();
      const dep = await createDependency({
        sourceId: source.id,
        targetId: target.id,
      });

      const result = await getDependency(dep.id);

      expect(result).not.toBeNull();
      expect(result!.source).toBeDefined();
      expect(result!.target).toBeDefined();
    });

    it("deleteDependency: deletes a dependency", async () => {
      const { source, target } = await createTwoComponents();
      const dep = await createDependency({
        sourceId: source.id,
        targetId: target.id,
      });

      await deleteDependency(dep.id);

      const result = await getDependency(dep.id);
      expect(result).toBeNull();
    });

    it("reorderDependency: swaps orders", async () => {
      const plugin = await createPlugin({ name: "P" });
      const source = await createComponent(plugin.id, {
        type: "SKILL",
        name: "source",
        skillType: "ENTRY_POINT",
      });
      const target1 = await createComponent(plugin.id, {
        type: "SKILL",
        name: "t1",
        skillType: "WORKER",
      });
      const target2 = await createComponent(plugin.id, {
        type: "SKILL",
        name: "t2",
        skillType: "WORKER",
      });

      const dep1 = await createDependency({
        sourceId: source.id,
        targetId: target1.id,
      });
      const dep2 = await createDependency({
        sourceId: source.id,
        targetId: target2.id,
      });

      await reorderDependency(dep1.id, "down");

      const updatedDep1 = await getDependency(dep1.id);
      const updatedDep2 = await getDependency(dep2.id);
      expect(updatedDep1!.order).toBe(1);
      expect(updatedDep2!.order).toBe(0);
    });

    it("verifyDependenciesOwnership: returns true for owned dependencies", async () => {
      const { plugin, source, target } = await createTwoComponents();
      const dep = await createDependency({
        sourceId: source.id,
        targetId: target.id,
      });

      const result = await verifyDependenciesOwnership([dep.id], plugin.id);

      expect(result).toBe(true);
    });

    it("verifyDependenciesOwnership: returns false for wrong plugin", async () => {
      const { source, target } = await createTwoComponents();
      const dep = await createDependency({
        sourceId: source.id,
        targetId: target.id,
      });

      const result = await verifyDependenciesOwnership(
        [dep.id],
        "wrong-plugin-id",
      );

      expect(result).toBe(false);
    });

    it("deleteDependenciesBatch: deletes multiple dependencies", async () => {
      const plugin = await createPlugin({ name: "P" });
      const source = await createComponent(plugin.id, {
        type: "SKILL",
        name: "source",
        skillType: "ENTRY_POINT",
      });
      const t1 = await createComponent(plugin.id, {
        type: "SKILL",
        name: "t1",
        skillType: "WORKER",
      });
      const t2 = await createComponent(plugin.id, {
        type: "SKILL",
        name: "t2",
        skillType: "WORKER",
      });

      const dep1 = await createDependency({
        sourceId: source.id,
        targetId: t1.id,
      });
      const dep2 = await createDependency({
        sourceId: source.id,
        targetId: t2.id,
      });

      const result = await deleteDependenciesBatch([dep1.id, dep2.id]);

      expect(result.count).toBe(2);

      const check1 = await getDependency(dep1.id);
      const check2 = await getDependency(dep2.id);
      expect(check1).toBeNull();
      expect(check2).toBeNull();
    });
  });
});
