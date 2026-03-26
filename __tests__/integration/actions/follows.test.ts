import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/app/lib/db";
import { signToken } from "@/app/lib/auth";

const mockCookieStore = { set: vi.fn(), delete: vi.fn(), get: vi.fn() };
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

const { followUser, unfollowUser, getIsFollowing, getFollowers, getFollowing } =
  await import("@/app/actions/follows");

// ── helpers ──────────────────────────────────────────────────────────────────

async function createUser(suffix: string) {
  return prisma.user.create({
    data: {
      email: `user_${suffix}@followtest.com`,
      username: `user_${suffix}`,
      name: `User ${suffix}`,
      passwordHash: "hash",
    },
  });
}

async function mockSession(userId: string, username: string) {
  const token = await signToken({ userId, username });
  mockCookieStore.get.mockReturnValue({ value: token });
}

// ── setup ────────────────────────────────────────────────────────────────────

beforeEach(async () => {
  await prisma.follow.deleteMany();
  await prisma.user.deleteMany({ where: { email: { contains: "@followtest.com" } } });
  mockCookieStore.get.mockReset();
});

// ── followUser ───────────────────────────────────────────────────────────────

describe("followUser", () => {
  it("creates a follow record and increments counts", async () => {
    const alice = await createUser("alice");
    const bob = await createUser("bob");
    await mockSession(alice.id, alice.username);

    const result = await followUser(bob.id);

    expect(result.error).toBeNull();
    expect(result.data).toBe(true);

    const follow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: alice.id, followingId: bob.id } },
    });
    expect(follow).not.toBeNull();

    const updatedAlice = await prisma.user.findUnique({ where: { id: alice.id } });
    const updatedBob = await prisma.user.findUnique({ where: { id: bob.id } });
    expect(updatedAlice!.followingCount).toBe(1);
    expect(updatedBob!.followersCount).toBe(1);
  });

  it("returns error when trying to follow yourself", async () => {
    const alice = await createUser("alice_self");
    await mockSession(alice.id, alice.username);

    const result = await followUser(alice.id);

    expect(result.error).toBe("Cannot follow yourself");
    expect(result.data).toBeNull();
  });

  it("returns error when already following", async () => {
    const alice = await createUser("alice_dup");
    const bob = await createUser("bob_dup");
    await mockSession(alice.id, alice.username);

    await followUser(bob.id);
    const result = await followUser(bob.id);

    expect(result.error).toBe("Already following");
    expect(result.data).toBeNull();
  });
});

// ── unfollowUser ─────────────────────────────────────────────────────────────

describe("unfollowUser", () => {
  it("removes the follow record and decrements counts", async () => {
    const alice = await createUser("alice_unfollow");
    const bob = await createUser("bob_unfollow");
    await mockSession(alice.id, alice.username);

    await followUser(bob.id);
    const result = await unfollowUser(bob.id);

    expect(result.error).toBeNull();
    expect(result.data).toBe(true);

    const follow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: alice.id, followingId: bob.id } },
    });
    expect(follow).toBeNull();

    const updatedAlice = await prisma.user.findUnique({ where: { id: alice.id } });
    const updatedBob = await prisma.user.findUnique({ where: { id: bob.id } });
    expect(updatedAlice!.followingCount).toBe(0);
    expect(updatedBob!.followersCount).toBe(0);
  });

  it("returns error when not following", async () => {
    const alice = await createUser("alice_nf");
    const bob = await createUser("bob_nf");
    await mockSession(alice.id, alice.username);

    const result = await unfollowUser(bob.id);

    expect(result.error).toBe("Not following");
    expect(result.data).toBeNull();
  });
});

// ── getIsFollowing ────────────────────────────────────────────────────────────

describe("getIsFollowing", () => {
  it("returns true when following", async () => {
    const alice = await createUser("alice_gif");
    const bob = await createUser("bob_gif");
    await mockSession(alice.id, alice.username);

    await followUser(bob.id);
    const result = await getIsFollowing(bob.id);

    expect(result).toBe(true);
  });

  it("returns false when not following", async () => {
    const alice = await createUser("alice_gif2");
    const bob = await createUser("bob_gif2");
    await mockSession(alice.id, alice.username);

    const result = await getIsFollowing(bob.id);

    expect(result).toBe(false);
  });

  it("returns false when not authenticated", async () => {
    const bob = await createUser("bob_gif3");
    mockCookieStore.get.mockReturnValue(undefined);

    const result = await getIsFollowing(bob.id);

    expect(result).toBe(false);
  });
});

// ── getFollowers / getFollowing ───────────────────────────────────────────────

describe("getFollowers", () => {
  it("returns users who follow the given user", async () => {
    const alice = await createUser("alice_fl");
    const bob = await createUser("bob_fl");
    await mockSession(alice.id, alice.username);

    await followUser(bob.id);

    const followers = await getFollowers(bob.id);
    expect(followers).toHaveLength(1);
    expect(followers[0].id).toBe(alice.id);
  });

  it("returns empty array when user has no followers", async () => {
    const bob = await createUser("bob_fl2");
    const followers = await getFollowers(bob.id);
    expect(followers).toHaveLength(0);
  });

  it("returns isFollowing false and isFollowingViewer false when unauthenticated", async () => {
    const alice = await createUser("alice_fl3");
    const bob = await createUser("bob_fl3");
    await mockSession(alice.id, alice.username);
    await followUser(bob.id);

    mockCookieStore.get.mockReturnValue(undefined);
    const followers = await getFollowers(bob.id);
    expect(followers[0].isFollowing).toBe(false);
    expect(followers[0].isFollowingViewer).toBe(false);
  });

  it("sets isFollowingViewer true when a follower also follows the viewer", async () => {
    const alice = await createUser("alice_fl4");
    const bob = await createUser("bob_fl4");

    // alice follows bob, bob follows alice back (mutual)
    await mockSession(alice.id, alice.username);
    await followUser(bob.id);
    await mockSession(bob.id, bob.username);
    await followUser(alice.id);

    // viewer = alice; bob is a follower of alice who also follows alice (isFollowingViewer=true)
    await mockSession(alice.id, alice.username);
    const followers = await getFollowers(alice.id);
    expect(followers[0].id).toBe(bob.id);
    expect(followers[0].isFollowing).toBe(true);
    expect(followers[0].isFollowingViewer).toBe(true);
  });
});

describe("getFollowing", () => {
  it("returns users the given user follows", async () => {
    const alice = await createUser("alice_fw");
    const bob = await createUser("bob_fw");
    await mockSession(alice.id, alice.username);

    await followUser(bob.id);

    const following = await getFollowing(alice.id);
    expect(following).toHaveLength(1);
    expect(following[0].id).toBe(bob.id);
  });

  it("returns empty array when user follows nobody", async () => {
    const alice = await createUser("alice_fw2");
    const following = await getFollowing(alice.id);
    expect(following).toHaveLength(0);
  });

  it("returns isFollowing false and isFollowingViewer false when unauthenticated", async () => {
    const alice = await createUser("alice_fw3");
    const bob = await createUser("bob_fw3");
    await mockSession(alice.id, alice.username);
    await followUser(bob.id);

    mockCookieStore.get.mockReturnValue(undefined);
    const following = await getFollowing(alice.id);
    expect(following[0].isFollowing).toBe(false);
    expect(following[0].isFollowingViewer).toBe(false);
  });

  it("sets isFollowingViewer true when someone alice follows also follows alice back", async () => {
    const alice = await createUser("alice_fw4");
    const bob = await createUser("bob_fw4");

    // alice follows bob, bob follows alice back (mutual)
    await mockSession(alice.id, alice.username);
    await followUser(bob.id);
    await mockSession(bob.id, bob.username);
    await followUser(alice.id);

    // viewer = alice; bob is in alice's following list and also follows alice (isFollowingViewer=true)
    await mockSession(alice.id, alice.username);
    const following = await getFollowing(alice.id);
    expect(following[0].id).toBe(bob.id);
    expect(following[0].isFollowing).toBe(true);
    expect(following[0].isFollowingViewer).toBe(true);
  });
});
