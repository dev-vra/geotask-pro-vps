import { describe, expect, it } from "vitest";
import { createTaskSchema, updateTaskSchema, deleteTaskSchema } from "../task";

describe("createTaskSchema", () => {
  it("should accept valid task with title only", () => {
    const result = createTaskSchema.safeParse({ title: "Nova Tarefa" });
    expect(result.success).toBe(true);
  });

  it("should accept full task data", () => {
    const result = createTaskSchema.safeParse({
      title: "Tarefa completa",
      description: "Descrição detalhada",
      type: "Preventiva",
      status: "Em Andamento",
      priority: "Alta",
      sector_id: 1,
      responsible_id: 2,
      contract_id: 3,
      deadline: "2025-12-31",
      created_by_id: 1,
    });
    expect(result.success).toBe(true);
  });

  it("should reject missing title", () => {
    const result = createTaskSchema.safeParse({ description: "sem titulo" });
    expect(result.success).toBe(false);
  });

  it("should reject empty title", () => {
    const result = createTaskSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("should default status to 'A Fazer'", () => {
    const result = createTaskSchema.safeParse({ title: "Test" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("A Fazer");
    }
  });

  it("should coerce string sector_id to number", () => {
    const result = createTaskSchema.safeParse({
      title: "Test",
      sector_id: "5",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sector_id).toBe(5);
    }
  });

  it("should accept nullable fields", () => {
    const result = createTaskSchema.safeParse({
      title: "Test",
      sector_id: null,
      responsible_id: null,
      deadline: null,
      parent_id: null,
    });
    expect(result.success).toBe(true);
  });

  it("should accept subtasks array", () => {
    const result = createTaskSchema.safeParse({
      title: "Tarefa pai",
      subtasks: [{ title: "Sub 1" }, { title: "Sub 2" }],
    });
    expect(result.success).toBe(true);
  });
});

describe("updateTaskSchema", () => {
  it("should accept valid update with id", () => {
    const result = updateTaskSchema.safeParse({ id: 1, status: "Concluído" });
    expect(result.success).toBe(true);
  });

  it("should reject missing id", () => {
    const result = updateTaskSchema.safeParse({ status: "Concluído" });
    expect(result.success).toBe(false);
  });

  it("should reject negative id", () => {
    const result = updateTaskSchema.safeParse({ id: -1 });
    expect(result.success).toBe(false);
  });

  it("should allow passthrough of additional fields", () => {
    const result = updateTaskSchema.safeParse({
      id: 1,
      title: "Updated",
      priority: "Alta",
      custom_field: "value",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(1);
      expect((result.data as any).title).toBe("Updated");
    }
  });
});

describe("deleteTaskSchema", () => {
  it("should accept valid id string", () => {
    const result = deleteTaskSchema.safeParse({ id: "42" });
    expect(result.success).toBe(true);
  });

  it("should reject empty id", () => {
    const result = deleteTaskSchema.safeParse({ id: "" });
    expect(result.success).toBe(false);
  });

  it("should coerce number to string", () => {
    const result = deleteTaskSchema.safeParse({ id: 42 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("42");
    }
  });
});
