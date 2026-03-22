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
  createAgentTeam,
  getAgentTeam,
  updateAgentTeam,
  deleteAgentTeam,
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
  await testPrisma.agentTeam.deleteMany();
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
      expect(plugin!.agentTeams).toBeDefined();
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

    it("createComponent(AGENT): creates with agentConfig", async () => {
      const plugin = await createPlugin({ name: "P" });

      const component = await createComponent(plugin.id, {
        type: "AGENT",
        name: "my-agent",
        description: "An agent",
      });

      expect(component.type).toBe("AGENT");
      expect(component.agentConfig).not.toBeNull();
      expect(component.agentConfig!.name).toBe("my-agent");
    });

    it("getComponent: returns component with includes", async () => {
      const plugin = await createPlugin({ name: "P" });
      const created = await createComponent(plugin.id, {
        type: "SKILL",
        name: "s",
        skillType: "WORKER",
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

    it("deleteComponent: throws HAS_DEPENDENT_TEAMS when used as orchestrator", async () => {
      const plugin = await createPlugin({ name: "P" });
      const orchestrator = await createComponent(plugin.id, {
        type: "SKILL",
        name: "orch",
        skillType: "ENTRY_POINT",
      });
      await createAgentTeam(plugin.id, {
        orchestratorId: orchestrator.id,
        name: "Team",
      });

      await expect(deleteComponent(orchestrator.id)).rejects.toThrow(
        ValidationError,
      );
      try {
        await deleteComponent(orchestrator.id);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as InstanceType<typeof ValidationError>).code).toBe(
          "HAS_DEPENDENT_TEAMS",
        );
      }
    });
  });

  // ============================
  // AgentTeam CRUD
  // ============================
  describe("AgentTeam CRUD", () => {
    it("createAgentTeam: creates a team", async () => {
      const plugin = await createPlugin({ name: "P" });
      const orch = await createComponent(plugin.id, {
        type: "SKILL",
        name: "orch",
        skillType: "ENTRY_POINT",
      });

      const team = await createAgentTeam(plugin.id, {
        orchestratorId: orch.id,
        name: "Team A",
        description: "desc",
      });

      expect(team.id).toBeDefined();
      expect(team.name).toBe("Team A");
      expect(team.orchestratorId).toBe(orch.id);
    });

    it("getAgentTeam: returns team with members", async () => {
      const plugin = await createPlugin({ name: "P" });
      const orch = await createComponent(plugin.id, {
        type: "SKILL",
        name: "orch",
        skillType: "ENTRY_POINT",
      });
      const team = await createAgentTeam(plugin.id, {
        orchestratorId: orch.id,
        name: "Team",
      });

      const result = await getAgentTeam(team.id);

      expect(result).not.toBeNull();
      expect(result!.orchestrator).not.toBeNull();
      expect(result!.members).toBeDefined();
    });

    it("updateAgentTeam: updates name and description", async () => {
      const plugin = await createPlugin({ name: "P" });
      const orch = await createComponent(plugin.id, {
        type: "SKILL",
        name: "orch",
        skillType: "ENTRY_POINT",
      });
      const team = await createAgentTeam(plugin.id, {
        orchestratorId: orch.id,
        name: "Old",
      });

      const updated = await updateAgentTeam(team.id, {
        name: "New",
        description: "new desc",
      });

      expect(updated.name).toBe("New");
      expect(updated.description).toBe("new desc");
    });

    it("deleteAgentTeam: deletes team", async () => {
      const plugin = await createPlugin({ name: "P" });
      const orch = await createComponent(plugin.id, {
        type: "SKILL",
        name: "orch",
        skillType: "ENTRY_POINT",
      });
      const team = await createAgentTeam(plugin.id, {
        orchestratorId: orch.id,
        name: "Team",
      });

      await deleteAgentTeam(team.id);

      const result = await getAgentTeam(team.id);
      expect(result).toBeNull();
    });

    it("addAgentTeamMember: adds a member", async () => {
      const plugin = await createPlugin({ name: "P" });
      const orch = await createComponent(plugin.id, {
        type: "SKILL",
        name: "orch",
        skillType: "ENTRY_POINT",
      });
      const agent = await createComponent(plugin.id, {
        type: "AGENT",
        name: "agent",
      });
      const team = await createAgentTeam(plugin.id, {
        orchestratorId: orch.id,
        name: "Team",
      });

      const member = await addAgentTeamMember(team.id, {
        componentId: agent.id,
      });

      expect(member.teamId).toBe(team.id);
      expect(member.componentId).toBe(agent.id);
    });

    it("addAgentTeamMember: throws DUPLICATE_MEMBER on duplicate", async () => {
      const plugin = await createPlugin({ name: "P" });
      const orch = await createComponent(plugin.id, {
        type: "SKILL",
        name: "orch",
        skillType: "ENTRY_POINT",
      });
      const agent = await createComponent(plugin.id, {
        type: "AGENT",
        name: "agent",
      });
      const team = await createAgentTeam(plugin.id, {
        orchestratorId: orch.id,
        name: "Team",
      });

      await addAgentTeamMember(team.id, { componentId: agent.id });

      await expect(
        addAgentTeamMember(team.id, { componentId: agent.id }),
      ).rejects.toThrow(ValidationError);
    });

    it("removeAgentTeamMember: removes a member", async () => {
      const plugin = await createPlugin({ name: "P" });
      const orch = await createComponent(plugin.id, {
        type: "SKILL",
        name: "orch",
        skillType: "ENTRY_POINT",
      });
      const agent = await createComponent(plugin.id, {
        type: "AGENT",
        name: "agent",
      });
      const team = await createAgentTeam(plugin.id, {
        orchestratorId: orch.id,
        name: "Team",
      });
      const member = await addAgentTeamMember(team.id, {
        componentId: agent.id,
      });

      await removeAgentTeamMember(member.id);

      const result = await getAgentTeam(team.id);
      expect(result!.members.length).toBe(0);
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

    it("updateComponent(AGENT): input/outputが保存・取得できる", async () => {
      const plugin = await createPlugin({ name: "P" });
      const created = await createComponent(plugin.id, {
        type: "AGENT",
        name: "a",
        description: "desc",
      });

      const updated = await updateComponent(created.id, {
        type: "AGENT",
        name: "a",
        description: "desc",
        input: "入力テキスト",
        output: "出力テキスト",
      });

      expect(updated.agentConfig!.input).toBe("入力テキスト");
      expect(updated.agentConfig!.output).toBe("出力テキスト");
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
