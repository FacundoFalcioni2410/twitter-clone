import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { prisma } from "@/app/lib/db";
import { signToken } from "@/app/lib/auth";

const mockBroadcastLike = vi.fn();
vi.mock("@/app/lib/sse", () => ({ broadcastLike: mockBroadcastLike, broadcastNotification: vi.fn() }));

const mockCookieStore = { set: vi.fn(), delete: vi.fn(), get: vi.fn() };
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

const { likeTweet, unlikeTweet, getTweetLikes } = await import("@/app/actions/likes");

// ── helpers ──────────────────────────────────────────────────────────────────

async function createUser(suffix: string) {
  return prisma.user.create({
    data: {
      email: `user_${suffix}@liketest.com`,
      username: `user_${suffix}`,
      name: `User ${suffix}`,
      passwordHash: "hash",
    },
  });
}

async function createTweet(authorId: string) {
  return prisma.tweet.create({ data: { content: "test tweet", authorId } });
}

async function mockSession(userId: string, username: string) {
  const token = await signToken({ userId, username });
  mockCookieStore.get.mockReturnValue({ value: token });
}

// ── setup ────────────────────────────────────────────────────────────────────

async function cleanup() {
  await prisma.like.deleteMany({ where: { user: { email: { contains: "@liketest.com" } } } });
  await prisma.tweet.deleteMany({ where: { author: { email: { contains: "@liketest.com" } } } });
  await prisma.user.deleteMany({ where: { email: { contains: "@liketest.com" } } });
}

beforeEach(async () => {
  await cleanup();
  mockCookieStore.get.mockReset();
  mockBroadcastLike.mockReset();
});

afterAll(cleanup);

// ── likeTweet ─────────────────────────────────────────────────────────────────

describe("likeTweet", () => {
  it("creates a like and increments likeCount", async () => {
    const alice = await createUser("lt1a");
    const bob = await createUser("lt1b");
    const tweet = await createTweet(bob.id);
    await mockSession(alice.id, alice.username);

    const result = await likeTweet(tweet.id);

    expect(result.error).toBeNull();
    expect(result.data).toBe(true);

    const like = await prisma.like.findUnique({
      where: { userId_tweetId: { userId: alice.id, tweetId: tweet.id } },
    });
    expect(like).not.toBeNull();

    const updated = await prisma.tweet.findUnique({ where: { id: tweet.id } });
    expect(updated!.likeCount).toBe(1);
  });

  it("calls broadcastLike with updated count", async () => {
    const alice = await createUser("lt1c_a");
    const bob = await createUser("lt1c_b");
    const tweet = await createTweet(bob.id);
    await mockSession(alice.id, alice.username);

    await likeTweet(tweet.id);

    expect(mockBroadcastLike).toHaveBeenCalledOnce();
    expect(mockBroadcastLike).toHaveBeenCalledWith(tweet.id, 1);
  });

  it("returns error when already liked", async () => {
    const alice = await createUser("lt2a");
    const bob = await createUser("lt2b");
    const tweet = await createTweet(bob.id);
    await mockSession(alice.id, alice.username);

    await likeTweet(tweet.id);
    const result = await likeTweet(tweet.id);

    expect(result.error).toBe("Already liked");
    expect(result.data).toBeNull();

    const updated = await prisma.tweet.findUnique({ where: { id: tweet.id } });
    expect(updated!.likeCount).toBe(1);
  });

  it("throws when not authenticated", async () => {
    const bob = await createUser("lt3");
    const tweet = await createTweet(bob.id);
    mockCookieStore.get.mockReturnValue(undefined);

    await expect(likeTweet(tweet.id)).rejects.toThrow();
  });
});

// ── unlikeTweet ───────────────────────────────────────────────────────────────

describe("unlikeTweet", () => {
  it("removes the like and decrements likeCount", async () => {
    const alice = await createUser("ul1a");
    const bob = await createUser("ul1b");
    const tweet = await createTweet(bob.id);
    await mockSession(alice.id, alice.username);

    await likeTweet(tweet.id);
    const result = await unlikeTweet(tweet.id);

    expect(result.error).toBeNull();
    expect(result.data).toBe(true);

    const like = await prisma.like.findUnique({
      where: { userId_tweetId: { userId: alice.id, tweetId: tweet.id } },
    });
    expect(like).toBeNull();

    const updated = await prisma.tweet.findUnique({ where: { id: tweet.id } });
    expect(updated!.likeCount).toBe(0);
  });

  it("calls broadcastLike with updated count", async () => {
    const alice = await createUser("ul1c_a");
    const bob = await createUser("ul1c_b");
    const tweet = await createTweet(bob.id);
    await mockSession(alice.id, alice.username);

    await likeTweet(tweet.id);
    mockBroadcastLike.mockReset();
    await unlikeTweet(tweet.id);

    expect(mockBroadcastLike).toHaveBeenCalledOnce();
    expect(mockBroadcastLike).toHaveBeenCalledWith(tweet.id, 0);
  });

  it("returns error when not liked", async () => {
    const alice = await createUser("ul2a");
    const bob = await createUser("ul2b");
    const tweet = await createTweet(bob.id);
    await mockSession(alice.id, alice.username);

    const result = await unlikeTweet(tweet.id);

    expect(result.error).toBe("Not liked");
    expect(result.data).toBeNull();
  });

  it("throws when not authenticated", async () => {
    const bob = await createUser("ul3");
    const tweet = await createTweet(bob.id);
    mockCookieStore.get.mockReturnValue(undefined);

    await expect(unlikeTweet(tweet.id)).rejects.toThrow();
  });
});

// ── getTweetLikes ─────────────────────────────────────────────────────────────

describe("getTweetLikes", () => {
  it("returns users who liked the tweet, newest first", async () => {
    const alice = await createUser("tl1a");
    const bob = await createUser("tl1b");
    const carol = await createUser("tl1c");
    const tweet = await createTweet(alice.id);

    await mockSession(bob.id, bob.username);
    await likeTweet(tweet.id);
    await mockSession(carol.id, carol.username);
    await likeTweet(tweet.id);

    const likers = await getTweetLikes(tweet.id);

    expect(likers).toHaveLength(2);
    expect(likers[0].id).toBe(carol.id); // newest first
    expect(likers[1].id).toBe(bob.id);
  });

  it("returns empty array when nobody liked the tweet", async () => {
    const alice = await createUser("tl2");
    const tweet = await createTweet(alice.id);

    const likers = await getTweetLikes(tweet.id);
    expect(likers).toHaveLength(0);
  });

  it("includes user fields: username, name, avatarUrl, bio", async () => {
    const alice = await createUser("tl3a");
    const bob = await createUser("tl3b");
    const tweet = await createTweet(alice.id);

    await mockSession(bob.id, bob.username);
    await likeTweet(tweet.id);

    const likers = await getTweetLikes(tweet.id);
    expect(likers[0]).toMatchObject({
      id: bob.id,
      username: bob.username,
      name: bob.name,
    });
    expect("avatarUrl" in likers[0]).toBe(true);
    expect("bio" in likers[0]).toBe(true);
  });
});
