import { describe, it, expect } from "vitest";
import { signToken, verifyToken } from "@/app/lib/auth";

describe("signToken / verifyToken", () => {
  const payload = { userId: "user_123", username: "alice" };

  it("signs and verifies a token", async () => {
    const token = await signToken(payload);
    expect(typeof token).toBe("string");

    const result = await verifyToken(token);
    expect(result?.userId).toBe(payload.userId);
    expect(result?.username).toBe(payload.username);
  });

  it("returns null for an invalid token", async () => {
    const result = await verifyToken("invalid.token.here");
    expect(result).toBeNull();
  });

  it("returns null for a tampered token", async () => {
    const token = await signToken(payload);
    const tampered = token.slice(0, -5) + "XXXXX";
    const result = await verifyToken(tampered);
    expect(result).toBeNull();
  });
});
