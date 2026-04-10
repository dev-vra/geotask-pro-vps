import { describe, expect, it } from "vitest";
import { createCommentSchema } from "../comment";

describe("createCommentSchema", () => {
  it("should accept valid comment", () => {
    const result = createCommentSchema.safeParse({
      task_id: 1,
      content: "Bom trabalho!",
      user_id: 2,
    });
    expect(result.success).toBe(true);
  });

  it("should reject missing task_id", () => {
    const result = createCommentSchema.safeParse({
      content: "Comentário",
      user_id: 1,
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing content", () => {
    const result = createCommentSchema.safeParse({
      task_id: 1,
      user_id: 2,
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty content", () => {
    const result = createCommentSchema.safeParse({
      task_id: 1,
      content: "",
      user_id: 2,
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing user_id", () => {
    const result = createCommentSchema.safeParse({
      task_id: 1,
      content: "Test",
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative task_id", () => {
    const result = createCommentSchema.safeParse({
      task_id: -1,
      content: "Test",
      user_id: 1,
    });
    expect(result.success).toBe(false);
  });

  it("should reject zero user_id", () => {
    const result = createCommentSchema.safeParse({
      task_id: 1,
      content: "Test",
      user_id: 0,
    });
    expect(result.success).toBe(false);
  });

  it("should coerce string ids to numbers", () => {
    const result = createCommentSchema.safeParse({
      task_id: "5",
      content: "Coerced",
      user_id: "3",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.task_id).toBe(5);
      expect(result.data.user_id).toBe(3);
    }
  });
});
