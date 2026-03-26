import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema } from "@/app/lib/schemas/auth";

describe("registerSchema", () => {
  const valid = {
    name: "Alice",
    username: "alice_01",
    email: "alice@example.com",
    password: "Password1!",
  };

  it("accepts valid input", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = registerSchema.safeParse({ ...valid, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects username shorter than 3 chars", () => {
    const result = registerSchema.safeParse({ ...valid, username: "ab" });
    expect(result.success).toBe(false);
  });

  it("rejects username longer than 20 chars", () => {
    const result = registerSchema.safeParse({ ...valid, username: "a".repeat(21) });
    expect(result.success).toBe(false);
  });

  it("rejects username with invalid characters", () => {
    const result = registerSchema.safeParse({ ...valid, username: "alice@!" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = registerSchema.safeParse({ ...valid, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects password shorter than 8 chars", () => {
    const result = registerSchema.safeParse({ ...valid, password: "Short1!" });
    expect(result.success).toBe(false);
  });

  it("rejects password without uppercase", () => {
    const result = registerSchema.safeParse({ ...valid, password: "password1!" });
    expect(result.success).toBe(false);
  });

  it("rejects password without special character", () => {
    const result = registerSchema.safeParse({ ...valid, password: "Password1" });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  const valid = { email: "alice@example.com", password: "Password1!" };

  it("accepts valid input", () => {
    expect(loginSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({ ...valid, email: "bad" });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({ ...valid, password: "" });
    expect(result.success).toBe(false);
  });
});
