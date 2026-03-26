import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/app/lib/db";

// Mock Next.js server-only APIs
const mockCookieStore = { set: vi.fn(), delete: vi.fn(), get: vi.fn() };
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// Import actions after mocks are set up
const { register, login, logout } = await import("@/app/actions/auth");

const makeForm = (data: Record<string, string>) => {
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => fd.append(k, v));
  return fd;
};

const validUser = {
  name: "Alice",
  username: "alice_test",
  email: "alice@test.com",
  password: "Password1!",
};

beforeEach(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: "@test.com" } } });
  vi.clearAllMocks();
});

describe("register action", () => {
  it("creates a user and sets a session cookie on success", async () => {
    const result = await register(makeForm(validUser));

    expect(result).toBeUndefined(); // redirect was called, no return value
    const user = await prisma.user.findUnique({ where: { email: validUser.email } });
    expect(user).not.toBeNull();
    expect(user?.username).toBe(validUser.username);
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "session",
      expect.any(String),
      expect.objectContaining({ httpOnly: true })
    );
  });

  it("returns an error for duplicate email", async () => {
    await register(makeForm(validUser));
    vi.clearAllMocks();

    const result = await register(makeForm({ ...validUser, username: "alice_other" }));
    expect(result?.error).toMatch(/email/i);
  });

  it("returns an error for duplicate username", async () => {
    await register(makeForm(validUser));
    vi.clearAllMocks();

    const result = await register(makeForm({ ...validUser, email: "other@test.com" }));
    expect(result?.error).toMatch(/username/i);
  });

  it("returns a validation error for invalid input", async () => {
    const result = await register(makeForm({ ...validUser, password: "weak" }));
    expect(result?.error).toBeTruthy();
    expect(result?.data).toBeNull();
  });
});

describe("login action", () => {
  beforeEach(async () => {
    await register(makeForm(validUser));
    vi.clearAllMocks();
  });

  it("sets a session cookie with correct credentials", async () => {
    const result = await login(makeForm({ email: validUser.email, password: validUser.password }));

    expect(result).toBeUndefined(); // redirect was called
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "session",
      expect.any(String),
      expect.objectContaining({ httpOnly: true })
    );
  });

  it("returns an error for wrong password", async () => {
    const result = await login(makeForm({ email: validUser.email, password: "WrongPass1!" }));
    expect(result?.error).toBe("Invalid email or password");
  });

  it("returns an error for non-existent email", async () => {
    const result = await login(makeForm({ email: "nobody@test.com", password: validUser.password }));
    expect(result?.error).toBe("Invalid email or password");
  });

  it("returns a validation error for malformed email", async () => {
    const result = await login(makeForm({ email: "not-an-email", password: validUser.password }));
    expect(result?.error).toBeTruthy();
  });
});

describe("logout action", () => {
  it("deletes the session cookie", async () => {
    await logout();
    expect(mockCookieStore.delete).toHaveBeenCalledWith("session");
  });
});
