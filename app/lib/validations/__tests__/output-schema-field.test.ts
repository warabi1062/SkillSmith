import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../../../generated/prisma/client";
import { validateOutputSchemaFieldData } from "../output-schema-field.server";
import { ValidationError } from "../agent-team.server";

function createMockPrisma() {
  return {
    outputSchemaField: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  };
}

const validData = {
  componentFileId: "file-1",
  name: "field-name",
  fieldType: "TEXT",
  required: true,
};

describe("validateOutputSchemaFieldData", () => {
  // --- Success cases ---

  it("accepts valid TEXT field", async () => {
    const mockPrisma = createMockPrisma();

    await expect(
      validateOutputSchemaFieldData(
        mockPrisma as unknown as PrismaClient,
        validData,
      ),
    ).resolves.toBeUndefined();
  });

  it("accepts valid ENUM field with values", async () => {
    const mockPrisma = createMockPrisma();

    await expect(
      validateOutputSchemaFieldData(mockPrisma as unknown as PrismaClient, {
        ...validData,
        fieldType: "ENUM",
        enumValues: "A,B,C",
      }),
    ).resolves.toBeUndefined();
  });

  // --- NAME_REQUIRED ---

  it("throws NAME_REQUIRED when name is empty", async () => {
    const mockPrisma = createMockPrisma();

    try {
      await validateOutputSchemaFieldData(
        mockPrisma as unknown as PrismaClient,
        { ...validData, name: "" },
      );
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).field).toBe("name");
      expect((e as ValidationError).code).toBe("NAME_REQUIRED");
    }
  });

  // --- NAME_TOO_LONG (boundary: 100) ---

  it("accepts name at exactly 100 characters", async () => {
    const mockPrisma = createMockPrisma();

    await expect(
      validateOutputSchemaFieldData(mockPrisma as unknown as PrismaClient, {
        ...validData,
        name: "a".repeat(100),
      }),
    ).resolves.toBeUndefined();
  });

  it("throws NAME_TOO_LONG for name at 101 characters", async () => {
    const mockPrisma = createMockPrisma();

    try {
      await validateOutputSchemaFieldData(
        mockPrisma as unknown as PrismaClient,
        { ...validData, name: "a".repeat(101) },
      );
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe("NAME_TOO_LONG");
    }
  });

  // --- DUPLICATE_NAME ---

  it("throws DUPLICATE_NAME when field with same name exists", async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.outputSchemaField.findFirst.mockResolvedValue({
      id: "existing-field",
      name: "field-name",
    });

    try {
      await validateOutputSchemaFieldData(
        mockPrisma as unknown as PrismaClient,
        validData,
      );
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe("DUPLICATE_NAME");
    }
  });

  // --- INVALID_FIELD_TYPE ---

  it("throws INVALID_FIELD_TYPE for unknown field type", async () => {
    const mockPrisma = createMockPrisma();

    try {
      await validateOutputSchemaFieldData(
        mockPrisma as unknown as PrismaClient,
        { ...validData, fieldType: "UNKNOWN" },
      );
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe("INVALID_FIELD_TYPE");
    }
  });

  // --- ENUM_VALUES_REQUIRED ---

  it("throws ENUM_VALUES_REQUIRED when ENUM has no values", async () => {
    const mockPrisma = createMockPrisma();

    try {
      await validateOutputSchemaFieldData(
        mockPrisma as unknown as PrismaClient,
        { ...validData, fieldType: "ENUM", enumValues: "" },
      );
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe("ENUM_VALUES_REQUIRED");
    }
  });

  it("throws ENUM_VALUES_REQUIRED when ENUM has null values", async () => {
    const mockPrisma = createMockPrisma();

    try {
      await validateOutputSchemaFieldData(
        mockPrisma as unknown as PrismaClient,
        { ...validData, fieldType: "ENUM", enumValues: null },
      );
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe("ENUM_VALUES_REQUIRED");
    }
  });

  // --- ENUM_VALUES_INVALID_FORMAT ---

  it("throws ENUM_VALUES_INVALID_FORMAT for extra commas", async () => {
    const mockPrisma = createMockPrisma();

    try {
      await validateOutputSchemaFieldData(
        mockPrisma as unknown as PrismaClient,
        { ...validData, fieldType: "ENUM", enumValues: "A,,B" },
      );
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe("ENUM_VALUES_INVALID_FORMAT");
    }
  });

  it("throws ENUM_VALUES_INVALID_FORMAT for trailing comma", async () => {
    const mockPrisma = createMockPrisma();

    try {
      await validateOutputSchemaFieldData(
        mockPrisma as unknown as PrismaClient,
        { ...validData, fieldType: "ENUM", enumValues: "A,B," },
      );
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe("ENUM_VALUES_INVALID_FORMAT");
    }
  });

  // --- ENUM_VALUES_DUPLICATE ---

  it("throws ENUM_VALUES_DUPLICATE for duplicate enum values", async () => {
    const mockPrisma = createMockPrisma();

    try {
      await validateOutputSchemaFieldData(
        mockPrisma as unknown as PrismaClient,
        { ...validData, fieldType: "ENUM", enumValues: "A,B,A" },
      );
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe("ENUM_VALUES_DUPLICATE");
    }
  });

  // --- excludeFieldId ---

  it("excludes current field when checking for duplicates via excludeFieldId", async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.outputSchemaField.findFirst.mockResolvedValue(null);

    await validateOutputSchemaFieldData(
      mockPrisma as unknown as PrismaClient,
      { ...validData, excludeFieldId: "field-1" },
    );

    expect(mockPrisma.outputSchemaField.findFirst).toHaveBeenCalledWith({
      where: {
        componentFileId: "file-1",
        name: "field-name",
        id: { not: "field-1" },
      },
    });
  });
});
