import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { prisma } from "@/app/lib/db";
import { signToken } from "@/app/lib/auth";

const mockCookieStore = { set: vi.fn(), delete: vi.fn(), get: vi.fn() };
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const { updateProfile, searchUsers, getSuggestedUsers, getUserByUsername } = await import(
  "@/app/actions/users"
);

async function mockSession(userId: string, username = "testuser") {
  const token = await signToken({ userId, username });
  mockCookieStore.get.mockReturnValue({ value: token });
}

async function createUser(overrides: { username: string; name: string; followersCount?: number }) {
  return prisma.user.create({
    data: {
      email: `${overrides.username}@usertest.com`,
      username: overrides.username,
      name: overrides.name,
      passwordHash: "hash",
      followersCount: overrides.followersCount ?? 0,
    },
  });
}

async function cleanup() {
  await prisma.user.deleteMany({ where: { email: { contains: "@usertest.com" } } });
}

beforeEach(async () => {
  await cleanup();
  mockCookieStore.get.mockReset();
  vi.clearAllMocks();
});
afterAll(cleanup);

describe("getSuggestedUsers", () => {
  it("excludes the current user", async () => {
    const me = await createUser({ username: "me_u", name: "Me" });
    const results = await getSuggestedUsers(me.id);
    expect(results.map((u) => u.id)).not.toContain(me.id);
  });

  it("excludes users already followed", async () => {
    const me = await createUser({ username: "me2_u", name: "Me2" });
    const followed = await createUser({ username: "followed_u", name: "Followed" });
    const other = await createUser({ username: "other_u", name: "Other" });
    await prisma.follow.create({ data: { followerId: me.id, followingId: followed.id } });

    const results = await getSuggestedUsers(me.id);
    const ids = results.map((u) => u.id);
    expect(ids).not.toContain(followed.id);
    expect(ids).toContain(other.id);

    await prisma.follow.deleteMany({ where: { followerId: me.id } });
  });

  it("returns at most 3 users", async () => {
    const me = await createUser({ username: "me3_u", name: "Me3" });
    await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        createUser({ username: `suggest_u${i}`, name: `Suggest ${i}` })
      )
    );
    const results = await getSuggestedUsers(me.id);
    expect(results.length).toBeLessThanOrEqual(3);
  });
});

describe("getUserByUsername", () => {
  it("returns the user with all profile fields", async () => {
    const created = await createUser({ username: "profiletest_u", name: "Profile Test" });
    const user = await getUserByUsername("profiletest_u");
    expect(user).not.toBeNull();
    expect(user!.id).toBe(created.id);
    expect(user!.username).toBe("profiletest_u");
    expect(user).toHaveProperty("bio");
    expect(user).toHaveProperty("followersCount");
    expect(user).toHaveProperty("followingCount");
    expect(user).toHaveProperty("createdAt");
  });

  it("returns null for a non-existent username", async () => {
    const user = await getUserByUsername("doesnotexist_u");
    expect(user).toBeNull();
  });
});

describe("searchUsers", () => {
  it("returns empty array for empty query", async () => {
    await createUser({ username: "alice_u", name: "Alice" });
    expect(await searchUsers("")).toEqual([]);
    expect(await searchUsers("   ")).toEqual([]);
  });

  it("matches by username (case-insensitive)", async () => {
    await createUser({ username: "searchtest_u", name: "Someone" });
    const results = await searchUsers("SEARCHTEST");
    expect(results.map((u) => u.username)).toContain("searchtest_u");
  });

  it("matches by name (case-insensitive)", async () => {
    await createUser({ username: "xyz_u", name: "Findable Person" });
    const results = await searchUsers("findable");
    expect(results.map((u) => u.name)).toContain("Findable Person");
  });

  it("does not return users that don't match", async () => {
    await createUser({ username: "nomatch_u", name: "No Match" });
    const results = await searchUsers("zzznoresult");
    expect(results).toHaveLength(0);
  });

  it("returns at most 5 results", async () => {
    await Promise.all(
      Array.from({ length: 7 }, (_, i) =>
        createUser({ username: `bulk_u${i}`, name: `Bulk User ${i}` })
      )
    );
    const results = await searchUsers("bulk");
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it("orders results by followersCount descending", async () => {
    await createUser({ username: "popular_u", name: "Popular", followersCount: 100 });
    await createUser({ username: "unpopular_u", name: "Unpopular", followersCount: 1 });
    // both match "popular" — the one with more followers should come first
    const results = await searchUsers("popular");
    const usernames = results.map((u) => u.username);
    expect(usernames.indexOf("popular_u")).toBeLessThan(usernames.indexOf("unpopular_u"));
  });
});

// ── updateProfile ───────────────────────────────────────────────────────────────

describe("updateProfile", () => {
  it("updates name and bio for authenticated user", async () => {
    const user = await createUser({ username: "upd1_u", name: "Old Name" });
    await mockSession(user.id, user.username);

    const result = await updateProfile({ name: "New Name", bio: "New bio" });
    expect(result.error).toBeNull();

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated!.name).toBe("New Name");
    expect(updated!.bio).toBe("New bio");
  });

  it("clears bio when not provided", async () => {
    const user = await createUser({ username: "upd2_u", name: "Name" });
    await prisma.user.update({ where: { id: user.id }, data: { bio: "old bio" } });
    await mockSession(user.id, user.username);

    const result = await updateProfile({ name: "Name" });
    expect(result.error).toBeNull();

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated!.bio).toBeNull();
  });

  it("returns error for empty name", async () => {
    const user = await createUser({ username: "upd3_u", name: "Name" });
    await mockSession(user.id, user.username);

    const result = await updateProfile({ name: "" });
    expect(result.error).toBeTruthy();
    expect(result.data).toBeNull();
  });

  it("returns error for name over 50 characters", async () => {
    const user = await createUser({ username: "upd4_u", name: "Name" });
    await mockSession(user.id, user.username);

    const result = await updateProfile({ name: "a".repeat(51) });
    expect(result.error).toBeTruthy();
  });

  it("returns error for bio over 160 characters", async () => {
    const user = await createUser({ username: "upd5_u", name: "Name" });
    await mockSession(user.id, user.username);

    const result = await updateProfile({ name: "Name", bio: "b".repeat(161) });
    expect(result.error).toBeTruthy();
  });

  it("throws when not authenticated", async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    await expect(updateProfile({ name: "Name" })).rejects.toThrow();
  });
});
