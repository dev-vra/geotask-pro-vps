import { describe, expect, it } from "vitest";
import { changePasswordSchema, loginSchema } from "../auth";

describe("loginSchema", () => {
  it("should accept valid credentials", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "secret123",
    });
    expect(result.success).toBe(true);
  });

  it("should reject missing email", () => {
    const result = loginSchema.safeParse({ password: "secret123" });
    expect(result.success).toBe(false);
  });

  it("should reject invalid email format", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "secret123",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("should accept valid change password data", () => {
    const result = changePasswordSchema.safeParse({
      userId: 1,
      newPassword: "newpass123",
      currentPassword: "oldpass",
    });
    expect(result.success).toBe(true);
  });

  it("should reject short new password", () => {
    const result = changePasswordSchema.safeParse({
      userId: 1,
      newPassword: "abc",
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid userId", () => {
    const result = changePasswordSchema.safeParse({
      userId: -1,
      newPassword: "validpass",
    });
    expect(result.success).toBe(false);
  });

  it("should allow null currentPassword (admin reset)", () => {
    const result = changePasswordSchema.safeParse({
      userId: 1,
      newPassword: "newpass123",
      currentPassword: null,
    });
    expect(result.success).toBe(true);
  });
});
