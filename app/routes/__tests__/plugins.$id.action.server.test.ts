import { beforeEach, describe, expect, it, vi } from "vitest";
import { ValidationError } from "../../lib/validations";

// --- Mocks ---

const mockGetPlugin = vi.fn();
const mockGetComponent = vi.fn();
const mockCreateComponent = vi.fn();
const mockUpdateComponent = vi.fn();
const mockDeleteComponent = vi.fn();
const mockDeletePlugin = vi.fn();
const mockAddAgentTeamMember = vi.fn();
const mockRemoveAgentTeamMember = vi.fn();
const mockGetDependency = vi.fn();
const mockCreateDependency = vi.fn();
const mockDeleteDependency = vi.fn();
const mockReorderDependency = vi.fn();
const mockDeleteDependenciesBatch = vi.fn();
const mockVerifyDependenciesOwnership = vi.fn();
const mockCreateComponentFile = vi.fn();
const mockGetComponentFile = vi.fn();
const mockUpdateComponentFile = vi.fn();
const mockDeleteComponentFile = vi.fn();
vi.mock("../../lib/plugins.server", () => ({
  getPlugin: (...args: unknown[]) => mockGetPlugin(...args),
  getComponent: (...args: unknown[]) => mockGetComponent(...args),
  createComponent: (...args: unknown[]) => mockCreateComponent(...args),
  updateComponent: (...args: unknown[]) => mockUpdateComponent(...args),
  deleteComponent: (...args: unknown[]) => mockDeleteComponent(...args),
  deletePlugin: (...args: unknown[]) => mockDeletePlugin(...args),
  addAgentTeamMember: (...args: unknown[]) =>
    mockAddAgentTeamMember(...args),
  removeAgentTeamMember: (...args: unknown[]) =>
    mockRemoveAgentTeamMember(...args),
  getDependency: (...args: unknown[]) => mockGetDependency(...args),
  createDependency: (...args: unknown[]) => mockCreateDependency(...args),
  deleteDependency: (...args: unknown[]) => mockDeleteDependency(...args),
  reorderDependency: (...args: unknown[]) =>
    mockReorderDependency(...args),
  deleteDependenciesBatch: (...args: unknown[]) =>
    mockDeleteDependenciesBatch(...args),
  verifyDependenciesOwnership: (...args: unknown[]) =>
    mockVerifyDependenciesOwnership(...args),
  createComponentFile: (...args: unknown[]) =>
    mockCreateComponentFile(...args),
  getComponentFile: (...args: unknown[]) => mockGetComponentFile(...args),
  updateComponentFile: (...args: unknown[]) =>
    mockUpdateComponentFile(...args),
  deleteComponentFile: (...args: unknown[]) =>
    mockDeleteComponentFile(...args),
}));

const mockGeneratePlugin = vi.fn();
const mockValidateGeneratedPlugin = vi.fn();

vi.mock("../../lib/generator/index", () => ({
  generatePlugin: (...args: unknown[]) => mockGeneratePlugin(...args),
  validateGeneratedPlugin: (...args: unknown[]) =>
    mockValidateGeneratedPlugin(...args),
}));

// Import after mocks
const { action } = await import("../plugins.$id.action.server");

// --- Helpers ---

// react-router's data() returns a DataWithResponseInit object, not a Response.
// When thrown, it's caught as this object type.
interface DataWithResponseInit {
  type: "DataWithResponseInit";
  data: unknown;
  init: { status: number };
}

function isDataWithResponseInit(value: unknown): value is DataWithResponseInit {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as DataWithResponseInit).type === "DataWithResponseInit"
  );
}

const PLUGIN_ID = "plugin-1";

function makeFormData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) {
    fd.set(k, v);
  }
  return fd;
}

function makeRequest(formData: FormData): Request {
  return new Request("http://localhost/plugins/plugin-1", {
    method: "POST",
    body: formData,
  });
}

function makeActionArgs(formData: FormData) {
  return {
    request: makeRequest(formData),
    params: { id: PLUGIN_ID },
  } as any;
}

const MOCK_PLUGIN = {
  id: PLUGIN_ID,
  name: "Test Plugin",
  components: [],
};

/**
 * Captures a thrown value from an async function.
 * react-router's data() with throw produces DataWithResponseInit objects,
 * while redirect() produces Response objects.
 */
async function extractThrown(fn: () => Promise<unknown>): Promise<unknown> {
  try {
    await fn();
    throw new Error("Expected function to throw");
  } catch (error) {
    return error;
  }
}

// --- Tests ---

beforeEach(() => {
  vi.clearAllMocks();
  mockGetPlugin.mockResolvedValue(MOCK_PLUGIN);
});

describe("action", () => {
  // ============================
  // Plugin not found
  // ============================
  describe("plugin not found", () => {
    it("throws 404 when plugin does not exist", async () => {
      mockGetPlugin.mockResolvedValue(null);

      const thrown = await extractThrown(() =>
        action(makeActionArgs(makeFormData({ intent: "create-component" }))),
      );

      expect(isDataWithResponseInit(thrown)).toBe(true);
      expect((thrown as DataWithResponseInit).init.status).toBe(404);
    });
  });

  // ============================
  // create-component
  // ============================
  describe("create-component", () => {
    it("returns success with componentId on valid input", async () => {
      mockCreateComponent.mockResolvedValue({ id: "comp-1" });

      const result = await action(
        makeActionArgs(
          makeFormData({
            intent: "create-component",
            type: "SKILL",
            name: "my-skill",
            description: "",
            skillType: "ENTRY_POINT",
          }),
        ),
      );

      expect(result).toEqual({ success: true, componentId: "comp-1" });
      expect(mockCreateComponent).toHaveBeenCalledWith(PLUGIN_ID, {
        type: "SKILL",
        name: "my-skill",
        description: null,
        skillType: "ENTRY_POINT",
      });
    });

    it("returns DataWithResponseInit with status 400 on validation error", async () => {
      const result = await action(
        makeActionArgs(
          makeFormData({
            intent: "create-component",
            type: "SKILL",
            name: "",
            description: "",
            skillType: "",
          }),
        ),
      );

      expect(isDataWithResponseInit(result)).toBe(true);
      const dwri = result as DataWithResponseInit;
      expect(dwri.init.status).toBe(400);
      expect((dwri.data as any).errors).toBeDefined();
    });
  });

  // ============================
  // update-component
  // ============================
  describe("update-component", () => {
    it("returns success on valid update", async () => {
      mockGetComponent.mockResolvedValue({
        id: "comp-1",
        pluginId: PLUGIN_ID,
        type: "SKILL",
      });
      mockUpdateComponent.mockResolvedValue({ id: "comp-1" });

      const result = await action(
        makeActionArgs(
          makeFormData({
            intent: "update-component",
            componentId: "comp-1",
            name: "updated",
            description: "",
            skillType: "WORKER",
            content: "# Updated content",
          }),
        ),
      );

      expect(result).toEqual({ success: true, componentId: "comp-1" });
      // contentとinput/outputがupdateComponentに渡されることを確認
      expect(mockUpdateComponent).toHaveBeenCalledWith("comp-1", {
        type: "SKILL",
        name: "updated",
        description: null,
        skillType: "WORKER",
        content: "# Updated content",
        input: "",
        output: "",
        allowedTools: "",
        argumentHint: "",
        disableModelInvocation: false,
      });
    });

    it("throws 404 when component not found", async () => {
      mockGetComponent.mockResolvedValue(null);

      const thrown = await extractThrown(() =>
        action(
          makeActionArgs(
            makeFormData({
              intent: "update-component",
              componentId: "non-existent",
              name: "x",
            }),
          ),
        ),
      );

      expect(isDataWithResponseInit(thrown)).toBe(true);
      expect((thrown as DataWithResponseInit).init.status).toBe(404);
    });

    it("throws 404 when pluginId does not match", async () => {
      mockGetComponent.mockResolvedValue({
        id: "comp-1",
        pluginId: "other-plugin",
        type: "SKILL",
      });

      const thrown = await extractThrown(() =>
        action(
          makeActionArgs(
            makeFormData({
              intent: "update-component",
              componentId: "comp-1",
              name: "x",
            }),
          ),
        ),
      );

      expect(isDataWithResponseInit(thrown)).toBe(true);
      expect((thrown as DataWithResponseInit).init.status).toBe(404);
    });

    it("returns 400 on validation error", async () => {
      mockGetComponent.mockResolvedValue({
        id: "comp-1",
        pluginId: PLUGIN_ID,
        type: "SKILL",
      });

      const result = await action(
        makeActionArgs(
          makeFormData({
            intent: "update-component",
            componentId: "comp-1",
            name: "",
            description: "",
            skillType: "",
          }),
        ),
      );

      expect(isDataWithResponseInit(result)).toBe(true);
      expect((result as DataWithResponseInit).init.status).toBe(400);
    });
  });

  // ============================
  // delete-component
  // ============================
  describe("delete-component", () => {
    it("returns success on deletion", async () => {
      mockGetComponent.mockResolvedValue({
        id: "comp-1",
        pluginId: PLUGIN_ID,
      });
      mockDeleteComponent.mockResolvedValue({});

      const result = await action(
        makeActionArgs(
          makeFormData({
            intent: "delete-component",
            componentId: "comp-1",
          }),
        ),
      );

      expect(result).toEqual({ success: true });
    });
  });

  // ============================
  // 廃止されたintent
  // ============================
  describe("deprecated intents", () => {
    it("create-agent-team returns Unknown intent", async () => {
      const thrown = await extractThrown(() =>
        action(
          makeActionArgs(
            makeFormData({
              intent: "create-agent-team",
              name: "Team",
              orchestratorId: "orch-1",
            }),
          ),
        ),
      );

      expect(isDataWithResponseInit(thrown)).toBe(true);
      expect((thrown as DataWithResponseInit).init.status).toBe(400);
    });

    it("update-agent-team returns Unknown intent", async () => {
      const thrown = await extractThrown(() =>
        action(
          makeActionArgs(
            makeFormData({
              intent: "update-agent-team",
              teamId: "team-1",
              name: "New Name",
            }),
          ),
        ),
      );

      expect(isDataWithResponseInit(thrown)).toBe(true);
      expect((thrown as DataWithResponseInit).init.status).toBe(400);
    });

    it("delete-agent-team returns Unknown intent", async () => {
      const thrown = await extractThrown(() =>
        action(
          makeActionArgs(
            makeFormData({
              intent: "delete-agent-team",
              teamId: "team-1",
            }),
          ),
        ),
      );

      expect(isDataWithResponseInit(thrown)).toBe(true);
      expect((thrown as DataWithResponseInit).init.status).toBe(400);
    });

    it("add-agent-config returns Unknown intent", async () => {
      const thrown = await extractThrown(() =>
        action(
          makeActionArgs(
            makeFormData({
              intent: "add-agent-config",
              componentId: "comp-1",
            }),
          ),
        ),
      );

      expect(isDataWithResponseInit(thrown)).toBe(true);
      expect((thrown as DataWithResponseInit).init.status).toBe(400);
    });

    it("remove-agent-config returns Unknown intent", async () => {
      const thrown = await extractThrown(() =>
        action(
          makeActionArgs(
            makeFormData({
              intent: "remove-agent-config",
              componentId: "comp-1",
            }),
          ),
        ),
      );

      expect(isDataWithResponseInit(thrown)).toBe(true);
      expect((thrown as DataWithResponseInit).init.status).toBe(400);
    });
  });

  // ============================
  // add-agent-team-member
  // ============================
  describe("add-agent-team-member", () => {
    it("returns success with agentTeamComponentId", async () => {
      mockGetComponent.mockResolvedValue({
        id: "team-comp-1",
        pluginId: PLUGIN_ID,
      });
      mockAddAgentTeamMember.mockResolvedValue({
        id: "member-1",
        agentTeamComponentId: "team-comp-1",
        componentId: "worker-1",
      });

      const result = await action(
        makeActionArgs(
          makeFormData({
            intent: "add-agent-team-member",
            agentTeamComponentId: "team-comp-1",
            memberComponentId: "worker-1",
          }),
        ),
      );

      expect(result).toEqual({ success: true, agentTeamComponentId: "team-comp-1" });
      expect(mockAddAgentTeamMember).toHaveBeenCalledWith("team-comp-1", {
        memberComponentId: "worker-1",
      });
    });
  });

  // ============================
  // delete-dependencies-batch
  // ============================
  describe("delete-dependencies-batch", () => {
    it("returns ok true on success", async () => {
      mockVerifyDependenciesOwnership.mockResolvedValue(true);
      mockDeleteDependenciesBatch.mockResolvedValue({ count: 2 });

      const result = await action(
        makeActionArgs(
          makeFormData({
            intent: "delete-dependencies-batch",
            dependencyIds: "dep-1,dep-2",
          }),
        ),
      );

      expect(result).toEqual({ ok: true });
    });

    it("throws 400 when dependencyIds is empty", async () => {
      const thrown = await extractThrown(() =>
        action(
          makeActionArgs(
            makeFormData({
              intent: "delete-dependencies-batch",
              dependencyIds: "",
            }),
          ),
        ),
      );

      expect(isDataWithResponseInit(thrown)).toBe(true);
      expect((thrown as DataWithResponseInit).init.status).toBe(400);
    });

    it("throws 403 when ownership verification fails", async () => {
      mockVerifyDependenciesOwnership.mockResolvedValue(false);

      const thrown = await extractThrown(() =>
        action(
          makeActionArgs(
            makeFormData({
              intent: "delete-dependencies-batch",
              dependencyIds: "dep-1",
            }),
          ),
        ),
      );

      expect(isDataWithResponseInit(thrown)).toBe(true);
      expect((thrown as DataWithResponseInit).init.status).toBe(403);
    });
  });

  // ============================
  // create-file
  // ============================
  describe("create-file", () => {
    it("returns success on valid input", async () => {
      mockGetComponent.mockResolvedValue({
        id: "comp-1",
        pluginId: PLUGIN_ID,
      });
      mockCreateComponentFile.mockResolvedValue({ id: "file-1" });

      const result = await action(
        makeActionArgs(
          makeFormData({
            intent: "create-file",
            componentId: "comp-1",
            role: "TEMPLATE",
            filename: "template.md",
            content: "# Content",
          }),
        ),
      );

      expect(result).toEqual({ success: true });
    });

    it("throws 404 when component not found", async () => {
      mockGetComponent.mockResolvedValue(null);

      const thrown = await extractThrown(() =>
        action(
          makeActionArgs(
            makeFormData({
              intent: "create-file",
              componentId: "non-existent",
              role: "TEMPLATE",
              filename: "f.md",
              content: "",
            }),
          ),
        ),
      );

      expect(isDataWithResponseInit(thrown)).toBe(true);
      expect((thrown as DataWithResponseInit).init.status).toBe(404);
    });
  });

  // ============================
  // update-component: allowedTools / argumentHint / disableModelInvocation
  // ============================
  describe("update-component skill fields", () => {
    it("passes allowedTools, argumentHint, disableModelInvocation to updateComponent", async () => {
      mockGetComponent.mockResolvedValue({
        id: "comp-1",
        pluginId: PLUGIN_ID,
        type: "SKILL",
      });
      mockUpdateComponent.mockResolvedValue({ id: "comp-1" });

      const result = await action(
        makeActionArgs(
          makeFormData({
            intent: "update-component",
            componentId: "comp-1",
            name: "s",
            description: "",
            skillType: "WORKER",
            content: "",
            allowedTools: '["Read"]',
            argumentHint: "<file>",
            disableModelInvocation: "true",
          }),
        ),
      );

      expect(result).toEqual({ success: true, componentId: "comp-1" });
      expect(mockUpdateComponent).toHaveBeenCalledWith("comp-1", {
        type: "SKILL",
        name: "s",
        description: null,
        skillType: "WORKER",
        content: "",
        input: "",
        output: "",
        allowedTools: '["Read"]',
        argumentHint: "<file>",
        disableModelInvocation: true,
      });
    });
  });

  // ============================
  // update-component: input/output
  // ============================
  describe("update-component input/output", () => {
    it("passes input and output from formData to updateComponent", async () => {
      mockGetComponent.mockResolvedValue({
        id: "comp-1",
        pluginId: PLUGIN_ID,
        type: "SKILL",
      });
      mockUpdateComponent.mockResolvedValue({ id: "comp-1" });

      const result = await action(
        makeActionArgs(
          makeFormData({
            intent: "update-component",
            componentId: "comp-1",
            name: "s",
            description: "",
            skillType: "WORKER",
            content: "",
            input: "- task ID",
            output: "- result path",
          }),
        ),
      );

      expect(result).toEqual({ success: true, componentId: "comp-1" });
      expect(mockUpdateComponent).toHaveBeenCalledWith("comp-1", {
        type: "SKILL",
        name: "s",
        description: null,
        skillType: "WORKER",
        content: "",
        input: "- task ID",
        output: "- result path",
        allowedTools: "",
        argumentHint: "",
        disableModelInvocation: false,
      });
    });
  });

  // ============================
  // add-dependency
  // ============================
  describe("add-dependency", () => {
    it("returns success on valid input", async () => {
      mockCreateDependency.mockResolvedValue({ id: "dep-1" });

      const result = await action(
        makeActionArgs(
          makeFormData({
            intent: "add-dependency",
            sourceId: "src-1",
            targetId: "tgt-1",
          }),
        ),
      );

      expect(result).toEqual({ success: true });
    });

    it("returns 400 on ValidationError", async () => {
      mockCreateDependency.mockRejectedValue(
        new ValidationError({
          field: "dependency",
          code: "DUPLICATE_DEPENDENCY",
          message: "Duplicate",
        }),
      );

      const result = await action(
        makeActionArgs(
          makeFormData({
            intent: "add-dependency",
            sourceId: "src-1",
            targetId: "tgt-1",
          }),
        ),
      );

      expect(isDataWithResponseInit(result)).toBe(true);
      expect((result as DataWithResponseInit).init.status).toBe(400);
    });
  });

  // ============================
  // delete-plugin
  // ============================
  describe("delete-plugin", () => {
    it("redirects to /plugins", async () => {
      mockDeletePlugin.mockResolvedValue({});

      const result = await action(
        makeActionArgs(
          makeFormData({
            intent: "delete-plugin",
          }),
        ),
      );

      // redirect() returns a Response object
      expect(result).toBeInstanceOf(Response);
      const response = result as Response;
      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/plugins");
    });
  });

  // ============================
  // generate-plugin
  // ============================
  describe("generate-plugin", () => {
    it("returns generation result on success", async () => {
      const generatedPlugin = {
        pluginName: "test-plugin",
        files: [{ path: "skills/test/SKILL.md", content: "# Skill" }],
        validationErrors: [] as any[],
      };
      mockGeneratePlugin.mockResolvedValue({
        plugin: generatedPlugin,
        components: [],
      });
      mockValidateGeneratedPlugin.mockReturnValue([]);

      const result = await action(
        makeActionArgs(
          makeFormData({
            intent: "generate-plugin",
          }),
        ),
      );

      // data() returns DataWithResponseInit
      expect(isDataWithResponseInit(result)).toBe(true);
      const dwri = result as DataWithResponseInit;
      const body = dwri.data as any;
      expect(body.success).toBe(true);
      expect(body.pluginName).toBe("test-plugin");
      expect(body.files).toHaveLength(1);
    });

    it("throws 404 when generatePlugin returns null", async () => {
      mockGeneratePlugin.mockResolvedValue(null);

      const thrown = await extractThrown(() =>
        action(
          makeActionArgs(
            makeFormData({
              intent: "generate-plugin",
            }),
          ),
        ),
      );

      expect(isDataWithResponseInit(thrown)).toBe(true);
      expect((thrown as DataWithResponseInit).init.status).toBe(404);
    });
  });

  // ============================
  // Unknown intent
  // ============================
  describe("unknown intent", () => {
    it("throws 400 with Unknown intent", async () => {
      const thrown = await extractThrown(() =>
        action(
          makeActionArgs(
            makeFormData({
              intent: "unknown-action",
            }),
          ),
        ),
      );

      expect(isDataWithResponseInit(thrown)).toBe(true);
      expect((thrown as DataWithResponseInit).init.status).toBe(400);
    });
  });
});
