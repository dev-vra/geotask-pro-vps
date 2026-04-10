import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword, sanitizeUser, DEFAULT_PASSWORD } from "../authService";

describe("hashPassword", () => {
  it("should return a bcrypt hash", async () => {
    const hash = await hashPassword("test123");
    expect(hash).toMatch(/^\$2[aby]?\$/);
    expect(hash.length).toBeGreaterThan(50);
  });

  it("should produce different hashes for same input", async () => {
    const hash1 = await hashPassword("same");
    const hash2 = await hashPassword("same");
    expect(hash1).not.toBe(hash2); // bcrypt salt
  });
});

describe("verifyPassword", () => {
  it("should verify bcrypt hashed password", async () => {
    const hash = await hashPassword("secret123");
    const valid = await verifyPassword("secret123", hash);
    expect(valid).toBe(true);
  });

  it("should reject wrong password against bcrypt hash", async () => {
    const hash = await hashPassword("correct");
    const valid = await verifyPassword("wrong", hash);
    expect(valid).toBe(false);
  });
});

describe("sanitizeUser", () => {
  it("should remove password_hash from user object", () => {
    const user = {
      id: 1,
      name: "Test",
      email: "test@example.com",
      password_hash: "$2b$10$secret",
      role: { name: "Admin" },
    };
    const safe = sanitizeUser(user);
    expect(safe).not.toHaveProperty("password_hash");
    expect(safe).toHaveProperty("id", 1);
    expect(safe).toHaveProperty("name", "Test");
    expect(safe).toHaveProperty("email", "test@example.com");
    expect(safe).toHaveProperty("role");
  });

  it("should return null for null input", () => {
    expect(sanitizeUser(null as any)).toBeNull();
  });

  it("should preserve all other fields", () => {
    const user = {
      id: 5,
      name: "Maria",
      email: "maria@test.com",
      password_hash: "hash",
      avatar: "MA",
      active: true,
      sector: { id: 1, name: "TI" },
      role: { id: 2, name: "Gestor" },
    };
    const safe = sanitizeUser(user);
    expect(safe).toEqual({
      id: 5,
      name: "Maria",
      email: "maria@test.com",
      avatar: "MA",
      active: true,
      sector: { id: 1, name: "TI" },
      role: { id: 2, name: "Gestor" },
    });
  });
});

describe("DEFAULT_PASSWORD", () => {
  it("should be defined and not empty", () => {
    expect(DEFAULT_PASSWORD).toBeTruthy();
    expect(typeof DEFAULT_PASSWORD).toBe("string");
  });
});
