import { describe, expect, it } from "vitest";
import { createUserSchema, updateUserSchema } from "../user";

describe("createUserSchema", () => {
  it("should accept valid user with role_id and sector_id", () => {
    const result = createUserSchema.safeParse({
      name: "João Silva",
      email: "joao@example.com",
      role_id: 1,
      sector_id: 2,
    });
    expect(result.success).toBe(true);
  });

  it("should accept valid user with role and sector (legacy)", () => {
    const result = createUserSchema.safeParse({
      name: "Maria",
      email: "maria@example.com",
      role: 3,
      sector: 1,
    });
    expect(result.success).toBe(true);
  });

  it("should reject missing name", () => {
    const result = createUserSchema.safeParse({
      email: "test@example.com",
      role_id: 1,
      sector_id: 2,
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid email", () => {
    const result = createUserSchema.safeParse({
      name: "Test",
      email: "invalid",
      role_id: 1,
      sector_id: 2,
    });
    expect(result.success).toBe(false);
  });

  it("should reject when neither role_id nor role provided", () => {
    const result = createUserSchema.safeParse({
      name: "Test",
      email: "test@example.com",
      sector_id: 2,
    });
    expect(result.success).toBe(false);
  });
});

describe("updateUserSchema", () => {
  it("should accept valid update", () => {
    const result = updateUserSchema.safeParse({
      id: 1,
      name: "Updated Name",
    });
    expect(result.success).toBe(true);
  });

  it("should reject missing id", () => {
    const result = updateUserSchema.safeParse({
      name: "Updated",
    });
    expect(result.success).toBe(false);
  });

  it("should accept password reset", () => {
    const result = updateUserSchema.safeParse({
      id: 1,
      resetPassword: true,
    });
    expect(result.success).toBe(true);
  });

  it("should reject short password", () => {
    const result = updateUserSchema.safeParse({
      id: 1,
      password: "abc",
    });
    expect(result.success).toBe(false);
  });
});
