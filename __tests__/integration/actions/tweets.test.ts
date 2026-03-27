import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { prisma } from "@/app/lib/db";
import { signToken } from "@/app/lib/auth";

// Mock Next.js server-only APIs
const mockCookieStore = { set: vi.fn(), delete: vi.fn(), get: vi.fn() };
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

const {
  createTweet,
  createReply,
  deleteTweet,
  getTweetById,
  getTweetReplies,
  getParentChain,
  getReplyChains,
  getTimeline,
  getUserTweets,
  getLikedTweets,
} = await import("@/app/actions/tweets");

// ── helpers ────────────────────────────────────────────────────────────────────

async function createUser(suffix: string) {
  return prisma.user.create({
    data: {
      email: `user_${suffix}@twtest.com`,
      username: `user_${suffix}`,
      name: `User ${suffix}`,
      passwordHash: "hash",
    },
  });
}

async function mockSession(userId: string, username = "testuser") {
  const token = await signToken({ userId, username });
  mockCookieStore.get.mockReturnValue({ value: token });
}

// ── setup ──────────────────────────────────────────────────────────────────────

async function cleanup() {
  await prisma.tweet.deleteMany({ where: { author: { email: { contains: "@twtest.com" } } } });
  await prisma.user.deleteMany({ where: { email: { contains: "@twtest.com" } } });
}

beforeEach(async () => {
  await cleanup();
  mockCookieStore.get.mockReset();
  vi.clearAllMocks();
});

afterAll(cleanup);

// ── createTweet ────────────────────────────────────────────────────────────────

describe("createTweet", () => {
  it("creates a tweet and returns it with author data", async () => {
    const user = await createUser("ct1");
    await mockSession(user.id);

    const result = await createTweet("Hello world");

    expect(result.error).toBeNull();
    expect(result.data?.content).toBe("Hello world");
    expect(result.data?.author.id).toBe(user.id);
    expect(typeof result.data?.createdAt).toBe("string");

    const dbTweet = await prisma.tweet.findFirst({ where: { authorId: user.id } });
    expect(dbTweet).not.toBeNull();
  });

  it("returns an error for empty content", async () => {
    const user = await createUser("ct2");
    await mockSession(user.id);

    const result = await createTweet("   ");
    expect(result.error).toBeTruthy();
    expect(result.data).toBeNull();
  });

  it("returns an error when content exceeds 280 characters", async () => {
    const user = await createUser("ct3");
    await mockSession(user.id);

    const result = await createTweet("a".repeat(281));
    expect(result.error).toBeTruthy();
    expect(result.data).toBeNull();
  });

  it("throws when not authenticated", async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    await expect(createTweet("Hello")).rejects.toThrow();
  });
});

// ── deleteTweet ────────────────────────────────────────────────────────────────

describe("deleteTweet", () => {
  it("deletes own tweet successfully", async () => {
    const user = await createUser("dt1");
    await mockSession(user.id);

    const tweet = await prisma.tweet.create({
      data: { content: "to delete", authorId: user.id },
    });

    const result = await deleteTweet(tweet.id);
    expect(result.error).toBeNull();
    expect(result.data).toBe(true);

    const dbTweet = await prisma.tweet.findUnique({ where: { id: tweet.id } });
    expect(dbTweet).not.toBeNull();
    expect(dbTweet!.deletedAt).not.toBeNull();
  });

  it("returns an error when deleting another user's tweet", async () => {
    const owner = await createUser("dt2");
    const other = await createUser("dt3");

    const tweet = await prisma.tweet.create({
      data: { content: "not yours", authorId: owner.id },
    });

    await mockSession(other.id);
    const result = await deleteTweet(tweet.id);
    expect(result.error).toBeTruthy();

    const dbTweet = await prisma.tweet.findUnique({ where: { id: tweet.id } });
    expect(dbTweet).not.toBeNull();
  });

  it("returns an error for a non-existent tweet", async () => {
    const user = await createUser("dt4");
    await mockSession(user.id);

    const result = await deleteTweet("non_existent_id");
    expect(result.error).toBeTruthy();
  });
});

// ── getTimeline ────────────────────────────────────────────────────────────────

async function createFollow(followerId: string, followingId: string) {
  await prisma.follow.create({ data: { followerId, followingId } });
}

describe("getTimeline", () => {
  it("includes own tweets", async () => {
    const user = await createUser("tl1");
    await mockSession(user.id, user.username);

    await prisma.tweet.create({ data: { content: "first", authorId: user.id } });
    await new Promise((r) => setTimeout(r, 5));
    await prisma.tweet.create({ data: { content: "second", authorId: user.id } });

    const { data } = await getTimeline();
    expect(data[0].content).toBe("second");
    expect(data[1].content).toBe("first");
  });

  it("includes tweets from followed users", async () => {
    const alice = await createUser("tl2a");
    const bob = await createUser("tl2b");
    const carol = await createUser("tl2c");
    await mockSession(alice.id, alice.username);
    await createFollow(alice.id, bob.id);

    await prisma.tweet.create({ data: { content: "bob tweet", authorId: bob.id } });
    await prisma.tweet.create({ data: { content: "carol tweet", authorId: carol.id } });

    const { data } = await getTimeline();
    expect(data.map((t) => t.content)).toContain("bob tweet");
    expect(data.map((t) => t.content)).not.toContain("carol tweet");
  });

  it("paginates correctly with cursor", async () => {
    const user = await createUser("tl3");
    await mockSession(user.id, user.username);

    for (let i = 0; i < 5; i++) {
      await prisma.tweet.create({ data: { content: `tweet ${i}`, authorId: user.id } });
      await new Promise((r) => setTimeout(r, 2));
    }

    const first = await getTimeline();
    expect(first.data.length).toBe(5);
    expect(first.nextCursor).toBeNull();

    const midId = first.data[2].id;
    const second = await getTimeline({ cursor: midId });
    expect(second.data.length).toBe(2);
    expect(second.data[0].id).toBe(first.data[3].id);
  });

  it("returns nextCursor when more than PAGE_SIZE tweets exist", async () => {
    const user = await createUser("tl4");
    await mockSession(user.id, user.username);

    await prisma.tweet.createMany({
      data: Array.from({ length: 21 }, (_, i) => ({
        content: `tweet ${i}`,
        authorId: user.id,
      })),
    });

    const { data, nextCursor } = await getTimeline();
    expect(data.length).toBe(20);
    expect(nextCursor).not.toBeNull();
  });

  it("includes author data on each tweet", async () => {
    const user = await createUser("tl5");
    await mockSession(user.id, user.username);
    await prisma.tweet.create({ data: { content: "hello", authorId: user.id } });

    const { data } = await getTimeline();
    expect(data[0].author.username).toBe(user.username);
    expect(data[0].author.name).toBe(user.name);
  });

  it("returns empty array when not authenticated", async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const { data } = await getTimeline();
    expect(data).toHaveLength(0);
  });
});

// ── getUserTweets ───────────────────────────────────────────────────────────────

describe("getUserTweets", () => {
  it("returns only tweets from the given user", async () => {
    const alice = await createUser("gut1a");
    const bob = await createUser("gut1b");
    await mockSession(alice.id);

    await prisma.tweet.create({ data: { content: "alice tweet", authorId: alice.id } });
    await prisma.tweet.create({ data: { content: "bob tweet", authorId: bob.id } });

    const { data } = await getUserTweets(alice.id);
    expect(data).toHaveLength(1);
    expect(data[0].content).toBe("alice tweet");
    expect(data[0].author.id).toBe(alice.id);
  });

  it("returns tweets ordered newest first", async () => {
    const user = await createUser("gut2");

    await prisma.tweet.create({ data: { content: "older", authorId: user.id } });
    await new Promise((r) => setTimeout(r, 5));
    await prisma.tweet.create({ data: { content: "newer", authorId: user.id } });

    const { data } = await getUserTweets(user.id);
    expect(data[0].content).toBe("newer");
    expect(data[1].content).toBe("older");
  });

  it("returns empty array when user has no tweets", async () => {
    const user = await createUser("gut3");
    await mockSession(user.id);
    const { data } = await getUserTweets(user.id);
    expect(data).toHaveLength(0);
  });

  it("paginates with cursor", async () => {
    const user = await createUser("gut4");

    for (let i = 0; i < 4; i++) {
      await prisma.tweet.create({ data: { content: `tweet ${i}`, authorId: user.id } });
      await new Promise((r) => setTimeout(r, 2));
    }

    const first = await getUserTweets(user.id);
    expect(first.data).toHaveLength(4);
    expect(first.nextCursor).toBeNull();

    const second = await getUserTweets(user.id, { cursor: first.data[1].id });
    expect(second.data).toHaveLength(2);
    expect(second.data[0].id).toBe(first.data[2].id);
  });

  it("returns nextCursor when more than PAGE_SIZE tweets exist", async () => {
    const user = await createUser("gut5");

    await prisma.tweet.createMany({
      data: Array.from({ length: 21 }, (_, i) => ({
        content: `tweet ${i}`,
        authorId: user.id,
      })),
    });

    const { data, nextCursor } = await getUserTweets(user.id);
    expect(data).toHaveLength(20);
    expect(nextCursor).not.toBeNull();
  });

  it("isLiked is false when not authenticated", async () => {
    const user = await createUser("gut6");
    await prisma.tweet.create({ data: { content: "hello", authorId: user.id } });
    mockCookieStore.get.mockReturnValue(undefined);

    const { data } = await getUserTweets(user.id);
    expect(data[0].isLiked).toBe(false);
  });
});

// ── getLikedTweets ──────────────────────────────────────────────────────────────

describe("getLikedTweets", () => {
  it("returns tweets liked by user, newest-liked first", async () => {
    const alice = await createUser("glt1a");
    const bob = await createUser("glt1b");

    const tweet1 = await prisma.tweet.create({ data: { content: "older", authorId: bob.id } });
    await new Promise((r) => setTimeout(r, 5));
    const tweet2 = await prisma.tweet.create({ data: { content: "newer", authorId: bob.id } });

    await prisma.like.create({ data: { userId: alice.id, tweetId: tweet1.id } });
    await new Promise((r) => setTimeout(r, 5));
    await prisma.like.create({ data: { userId: alice.id, tweetId: tweet2.id } });

    await mockSession(alice.id);
    const { data } = await getLikedTweets(alice.id);

    expect(data).toHaveLength(2);
    expect(data[0].id).toBe(tweet2.id); // newest liked first
    expect(data[1].id).toBe(tweet1.id);
  });

  it("returns empty array when user has no likes", async () => {
    const alice = await createUser("glt2");
    const { data } = await getLikedTweets(alice.id);
    expect(data).toHaveLength(0);
  });

  it("isLiked true when session user has liked the tweet", async () => {
    const alice = await createUser("glt3a");
    const bob = await createUser("glt3b");
    const tweet = await prisma.tweet.create({ data: { content: "hi", authorId: bob.id } });

    await prisma.like.create({ data: { userId: alice.id, tweetId: tweet.id } });
    await mockSession(alice.id);

    const { data } = await getLikedTweets(alice.id);
    expect(data[0].isLiked).toBe(true);
  });

  it("isLiked false when session user has not liked the tweet", async () => {
    const alice = await createUser("glt4a");
    const bob = await createUser("glt4b");
    const carol = await createUser("glt4c");
    const tweet = await prisma.tweet.create({ data: { content: "hi", authorId: bob.id } });

    await prisma.like.create({ data: { userId: alice.id, tweetId: tweet.id } });
    await mockSession(carol.id); // carol is viewing, but hasn't liked

    const { data } = await getLikedTweets(alice.id);
    expect(data[0].isLiked).toBe(false);
  });

  it("returns nextCursor when more than PAGE_SIZE likes exist", async () => {
    const alice = await createUser("glt5a");
    const bob = await createUser("glt5b");

    const tweets = await Promise.all(
      Array.from({ length: 21 }, (_, i) =>
        prisma.tweet.create({ data: { content: `tweet ${i}`, authorId: bob.id } })
      )
    );
    for (const t of tweets) {
      await prisma.like.create({ data: { userId: alice.id, tweetId: t.id } });
    }

    await mockSession(alice.id);
    const { data, nextCursor } = await getLikedTweets(alice.id);
    expect(data).toHaveLength(20);
    expect(nextCursor).not.toBeNull();
  });

  it("paginates correctly with cursor", async () => {
    const alice = await createUser("glt6a");
    const bob = await createUser("glt6b");

    const tweets = await Promise.all(
      Array.from({ length: 22 }, (_, i) =>
        prisma.tweet.create({ data: { content: `tweet ${i}`, authorId: bob.id } })
      )
    );
    for (const t of tweets) {
      await prisma.like.create({ data: { userId: alice.id, tweetId: t.id } });
      await new Promise((r) => setTimeout(r, 1));
    }

    await mockSession(alice.id);
    const first = await getLikedTweets(alice.id);
    expect(first.data).toHaveLength(20);
    expect(first.nextCursor).not.toBeNull();

    const second = await getLikedTweets(alice.id, { cursor: first.nextCursor! });
    expect(second.data).toHaveLength(2);
    expect(second.nextCursor).toBeNull();
  });

  it("isLiked is false when not authenticated", async () => {
    const alice = await createUser("glt7a");
    const bob = await createUser("glt7b");
    const tweet = await prisma.tweet.create({ data: { content: "hi", authorId: bob.id } });
    await prisma.like.create({ data: { userId: alice.id, tweetId: tweet.id } });
    mockCookieStore.get.mockReturnValue(undefined);

    const { data } = await getLikedTweets(alice.id);
    expect(data[0].isLiked).toBe(false);
  });
});

// ── createReply ─────────────────────────────────────────────────────────────────

describe("createReply", () => {
  it("creates a reply and increments parent replyCount", async () => {
    const user = await createUser("cr1");
    await mockSession(user.id);

    const parent = await prisma.tweet.create({ data: { content: "parent", authorId: user.id } });
    const result = await createReply(parent.id, "my reply");

    expect(result.error).toBeNull();
    expect(result.data?.content).toBe("my reply");
    expect(result.data?.parentId).toBe(parent.id);

    const updated = await prisma.tweet.findUnique({ where: { id: parent.id } });
    expect(updated!.replyCount).toBe(1);
  });

  it("returns error for empty content", async () => {
    const user = await createUser("cr2");
    await mockSession(user.id);
    const parent = await prisma.tweet.create({ data: { content: "parent", authorId: user.id } });

    const result = await createReply(parent.id, "   ");
    expect(result.error).toBeTruthy();
    expect(result.data).toBeNull();
  });

  it("returns error for content over 280 characters", async () => {
    const user = await createUser("cr3");
    await mockSession(user.id);
    const parent = await prisma.tweet.create({ data: { content: "parent", authorId: user.id } });

    const result = await createReply(parent.id, "a".repeat(281));
    expect(result.error).toBeTruthy();
    expect(result.data).toBeNull();
  });

  it("returns error when parent tweet does not exist", async () => {
    const user = await createUser("cr4");
    await mockSession(user.id);

    const result = await createReply("nonexistent_id", "reply");
    expect(result.error).toBeTruthy();
    expect(result.data).toBeNull();
  });

  it("redirects to login when not authenticated", async () => {
    const { redirect } = await import("next/navigation");
    mockCookieStore.get.mockReturnValue(undefined);
    await createReply("any", "reply");
    expect(redirect).toHaveBeenCalledWith(expect.stringContaining("/login"));
  });
});

// ── deleteTweet (with parent) ───────────────────────────────────────────────────

describe("deleteTweet (reply)", () => {
  it("decrements parent replyCount when a leaf reply is deleted", async () => {
    const user = await createUser("dtr1");
    await mockSession(user.id);

    const parent = await prisma.tweet.create({ data: { content: "parent", authorId: user.id } });
    // use the action so replyCount is incremented properly
    const replyResult = await createReply(parent.id, "my reply");
    const replyId = replyResult.data!.id;

    const before = await prisma.tweet.findUnique({ where: { id: parent.id } });
    expect(before!.replyCount).toBe(1);

    await mockSession(user.id);
    const result = await deleteTweet(replyId);
    expect(result.error).toBeNull();

    const after = await prisma.tweet.findUnique({ where: { id: parent.id } });
    expect(after!.replyCount).toBe(0);
  });

  it("does not decrement parent replyCount when deleted reply has children", async () => {
    const user = await createUser("dtr2");
    await mockSession(user.id);

    const parent = await prisma.tweet.create({ data: { content: "parent", authorId: user.id } });
    const replyResult = await createReply(parent.id, "reply with child");
    const replyId = replyResult.data!.id;

    await mockSession(user.id);
    // add a child to the reply so it has children
    await createReply(replyId, "grandchild");

    await mockSession(user.id);
    const result = await deleteTweet(replyId);
    expect(result.error).toBeNull();

    // parent replyCount should stay the same since the reply has children
    const after = await prisma.tweet.findUnique({ where: { id: parent.id } });
    expect(after!.replyCount).toBe(1);
  });
});

// ── getTweetById ────────────────────────────────────────────────────────────────

describe("getTweetById", () => {
  it("returns the tweet with author data", async () => {
    const user = await createUser("gtbi1");
    await mockSession(user.id);
    const tweet = await prisma.tweet.create({ data: { content: "hello", authorId: user.id } });

    const result = await getTweetById(tweet.id);
    expect(result).not.toBeNull();
    expect(result!.content).toBe("hello");
    expect(result!.author.id).toBe(user.id);
    expect(result!.deleted).toBe(false);
  });

  it("returns null for a non-existent tweet", async () => {
    const result = await getTweetById("nonexistent_id");
    expect(result).toBeNull();
  });

  it("returns a deleted tweet with deleted: true", async () => {
    const user = await createUser("gtbi2");
    const tweet = await prisma.tweet.create({
      data: { content: "gone", authorId: user.id, deletedAt: new Date() },
    });

    const result = await getTweetById(tweet.id);
    expect(result).not.toBeNull();
    expect(result!.deleted).toBe(true);
  });

  it("marks isLiked true when session user has liked the tweet", async () => {
    const user = await createUser("gtbi3");
    await mockSession(user.id);
    const tweet = await prisma.tweet.create({ data: { content: "hi", authorId: user.id } });
    await prisma.like.create({ data: { userId: user.id, tweetId: tweet.id } });

    const result = await getTweetById(tweet.id);
    expect(result!.isLiked).toBe(true);
  });

  it("isLiked is false when not authenticated", async () => {
    const user = await createUser("gtbi4");
    mockCookieStore.get.mockReturnValue(undefined);
    const tweet = await prisma.tweet.create({ data: { content: "hi", authorId: user.id } });

    const result = await getTweetById(tweet.id);
    expect(result!.isLiked).toBe(false);
  });
});

// ── getTweetReplies ─────────────────────────────────────────────────────────────

describe("getTweetReplies", () => {
  it("returns direct replies ordered oldest first", async () => {
    const user = await createUser("gtr1");
    const parent = await prisma.tweet.create({ data: { content: "parent", authorId: user.id } });

    await prisma.tweet.create({ data: { content: "first reply", authorId: user.id, parentId: parent.id } });
    await new Promise((r) => setTimeout(r, 5));
    await prisma.tweet.create({ data: { content: "second reply", authorId: user.id, parentId: parent.id } });

    const { data } = await getTweetReplies(parent.id);
    expect(data[0].content).toBe("first reply");
    expect(data[1].content).toBe("second reply");
  });

  it("excludes deleted leaf replies (no children)", async () => {
    const user = await createUser("gtr2");
    const parent = await prisma.tweet.create({ data: { content: "parent", authorId: user.id } });

    await prisma.tweet.create({ data: { content: "alive", authorId: user.id, parentId: parent.id } });
    // deleted with no children → should be excluded
    await prisma.tweet.create({
      data: { content: "deleted leaf", authorId: user.id, parentId: parent.id, deletedAt: new Date() },
    });

    const { data } = await getTweetReplies(parent.id);
    expect(data).toHaveLength(1);
    expect(data[0].content).toBe("alive");
  });

  it("includes deleted replies that have children", async () => {
    const user = await createUser("gtr6");
    const parent = await prisma.tweet.create({ data: { content: "parent", authorId: user.id } });

    const deleted = await prisma.tweet.create({
      data: { content: "deleted with child", authorId: user.id, parentId: parent.id, deletedAt: new Date(), replyCount: 1 },
    });
    await prisma.tweet.create({ data: { content: "grandchild", authorId: user.id, parentId: deleted.id } });

    const { data } = await getTweetReplies(parent.id);
    expect(data).toHaveLength(1);
    expect(data[0].deleted).toBe(true);
  });

  it("returns nextCursor when more replies exist than the limit", async () => {
    const user = await createUser("gtr3");
    const parent = await prisma.tweet.create({ data: { content: "parent", authorId: user.id } });

    await prisma.tweet.createMany({
      data: Array.from({ length: 3 }, (_, i) => ({
        content: `reply ${i}`,
        authorId: user.id,
        parentId: parent.id,
      })),
    });

    const { data, nextCursor } = await getTweetReplies(parent.id, { limit: 2 });
    expect(data).toHaveLength(2);
    expect(nextCursor).not.toBeNull();
  });

  it("paginates with cursor", async () => {
    const user = await createUser("gtr4");
    const parent = await prisma.tweet.create({ data: { content: "parent", authorId: user.id } });

    for (let i = 0; i < 3; i++) {
      await prisma.tweet.create({ data: { content: `reply ${i}`, authorId: user.id, parentId: parent.id } });
      await new Promise((r) => setTimeout(r, 2));
    }

    const first = await getTweetReplies(parent.id, { limit: 2 });
    expect(first.data).toHaveLength(2);

    const second = await getTweetReplies(parent.id, { limit: 2, cursor: first.data[1].id });
    expect(second.data).toHaveLength(1);
    expect(second.nextCursor).toBeNull();
  });

  it("isLiked is false when not authenticated", async () => {
    const user = await createUser("gtr5");
    const parent = await prisma.tweet.create({ data: { content: "parent", authorId: user.id } });
    await prisma.tweet.create({ data: { content: "reply", authorId: user.id, parentId: parent.id } });
    mockCookieStore.get.mockReturnValue(undefined);

    const { data } = await getTweetReplies(parent.id);
    expect(data[0].isLiked).toBe(false);
  });
});

// ── getParentChain ──────────────────────────────────────────────────────────────

describe("getParentChain", () => {
  it("returns empty array for a root tweet", async () => {
    const user = await createUser("gpc1");
    const tweet = await prisma.tweet.create({ data: { content: "root", authorId: user.id } });

    const chain = await getParentChain(tweet.id);
    expect(chain).toHaveLength(0);
  });

  it("returns ancestors oldest-first", async () => {
    const user = await createUser("gpc2");
    const root = await prisma.tweet.create({ data: { content: "root", authorId: user.id } });
    const child = await prisma.tweet.create({ data: { content: "child", authorId: user.id, parentId: root.id } });
    const grandchild = await prisma.tweet.create({ data: { content: "grandchild", authorId: user.id, parentId: child.id } });

    const chain = await getParentChain(grandchild.id);
    expect(chain).toHaveLength(2);
    expect(chain[0].id).toBe(root.id);
    expect(chain[1].id).toBe(child.id);
  });

  it("includes deleted ancestors with deleted: true", async () => {
    const user = await createUser("gpc3");
    const root = await prisma.tweet.create({
      data: { content: "deleted root", authorId: user.id, deletedAt: new Date() },
    });
    const child = await prisma.tweet.create({ data: { content: "child", authorId: user.id, parentId: root.id } });

    const chain = await getParentChain(child.id);
    expect(chain).toHaveLength(1);
    expect(chain[0].deleted).toBe(true);
  });

  it("returns empty likedSet when all ancestors are deleted (no alive tweets)", async () => {
    const user = await createUser("gpc4");
    await mockSession(user.id);
    const root = await prisma.tweet.create({
      data: { content: "deleted root", authorId: user.id, deletedAt: new Date() },
    });
    const child = await prisma.tweet.create({ data: { content: "child", authorId: user.id, parentId: root.id } });

    const chain = await getParentChain(child.id);
    // All ancestors are deleted so isLiked should be false (no likedSet query needed)
    expect(chain[0].isLiked).toBe(false);
  });

  it("isLiked is false when not authenticated", async () => {
    const user = await createUser("gpc5");
    mockCookieStore.get.mockReturnValue(undefined);
    const root = await prisma.tweet.create({ data: { content: "root", authorId: user.id } });
    const child = await prisma.tweet.create({ data: { content: "child", authorId: user.id, parentId: root.id } });

    const chain = await getParentChain(child.id);
    expect(chain[0].isLiked).toBe(false);
  });
});

// ── getReplyChains ──────────────────────────────────────────────────────────────

describe("getReplyChains", () => {
  it("returns chains for direct replies with no children", async () => {
    const user = await createUser("grc1");
    const root = await prisma.tweet.create({ data: { content: "root", authorId: user.id } });
    await prisma.tweet.create({ data: { content: "reply", authorId: user.id, parentId: root.id } });

    const { data } = await getReplyChains(root.id);
    expect(data).toHaveLength(1);
    expect(data[0].tweet.content).toBe("reply");
    expect(data[0].firstChild).toBeNull();
    expect(data[0].grandchild).toBeNull();
  });

  it("includes firstChild when reply has children", async () => {
    const user = await createUser("grc2");
    const root = await prisma.tweet.create({ data: { content: "root", authorId: user.id } });
    const reply = await prisma.tweet.create({
      data: { content: "reply", authorId: user.id, parentId: root.id, replyCount: 1 },
    });
    const child = await prisma.tweet.create({ data: { content: "child", authorId: user.id, parentId: reply.id } });

    const { data } = await getReplyChains(root.id);
    expect(data[0].firstChild).not.toBeNull();
    expect(data[0].firstChild!.id).toBe(child.id);
  });

  it("includes grandchild when firstChild has children", async () => {
    const user = await createUser("grc3");
    const root = await prisma.tweet.create({ data: { content: "root", authorId: user.id } });
    const reply = await prisma.tweet.create({
      data: { content: "reply", authorId: user.id, parentId: root.id, replyCount: 1 },
    });
    const child = await prisma.tweet.create({
      data: { content: "child", authorId: user.id, parentId: reply.id, replyCount: 1 },
    });
    const grandchild = await prisma.tweet.create({
      data: { content: "grandchild", authorId: user.id, parentId: child.id },
    });

    const { data } = await getReplyChains(root.id);
    expect(data[0].grandchild).not.toBeNull();
    expect(data[0].grandchild!.id).toBe(grandchild.id);
  });

  it("sets hasMoreSiblings when a reply has more than one child", async () => {
    const user = await createUser("grc4");
    const root = await prisma.tweet.create({ data: { content: "root", authorId: user.id } });
    const reply = await prisma.tweet.create({
      data: { content: "reply", authorId: user.id, parentId: root.id, replyCount: 2 },
    });
    await prisma.tweet.create({ data: { content: "child1", authorId: user.id, parentId: reply.id } });
    await new Promise((r) => setTimeout(r, 2));
    await prisma.tweet.create({ data: { content: "child2", authorId: user.id, parentId: reply.id } });

    const { data } = await getReplyChains(root.id);
    expect(data[0].hasMoreSiblings).toBe(true);
  });

  it("returns nextCursor when more chains exist than the limit", async () => {
    const user = await createUser("grc5");
    const root = await prisma.tweet.create({ data: { content: "root", authorId: user.id } });
    await prisma.tweet.createMany({
      data: Array.from({ length: 3 }, (_, i) => ({
        content: `reply ${i}`,
        authorId: user.id,
        parentId: root.id,
      })),
    });

    const { data, nextCursor } = await getReplyChains(root.id, { limit: 2 });
    expect(data).toHaveLength(2);
    expect(nextCursor).not.toBeNull();
  });

  it("handles stale replyCount: reply says it has children but none exist", async () => {
    const user = await createUser("grc6");
    const root = await prisma.tweet.create({ data: { content: "root", authorId: user.id } });
    // Manually set replyCount > 0 but create no children
    await prisma.tweet.create({
      data: { content: "reply", authorId: user.id, parentId: root.id, replyCount: 1 },
    });

    const { data } = await getReplyChains(root.id);
    expect(data[0].firstChild).toBeNull();
    expect(data[0].hasMoreSiblings).toBe(false);
  });

  it("sets hasMoreGrandchildren when grandchild itself has replies", async () => {
    const user = await createUser("grc7");
    const root = await prisma.tweet.create({ data: { content: "root", authorId: user.id } });
    const reply = await prisma.tweet.create({
      data: { content: "reply", authorId: user.id, parentId: root.id, replyCount: 1 },
    });
    const child = await prisma.tweet.create({
      data: { content: "child", authorId: user.id, parentId: reply.id, replyCount: 1 },
    });
    // grandchild has its own replies (replyCount > 0) but we only fetch 1
    await prisma.tweet.create({
      data: { content: "grandchild", authorId: user.id, parentId: child.id, replyCount: 1 },
    });

    const { data } = await getReplyChains(root.id);
    expect(data[0].grandchild).not.toBeNull();
    expect(data[0].hasMoreGrandchildren).toBe(true);
  });

  it("grandchild is null when firstChild children are all deleted", async () => {
    const user = await createUser("grc8");
    const root = await prisma.tweet.create({ data: { content: "root", authorId: user.id } });
    const reply = await prisma.tweet.create({
      data: { content: "reply", authorId: user.id, parentId: root.id, replyCount: 1 },
    });
    const child = await prisma.tweet.create({
      data: { content: "child", authorId: user.id, parentId: reply.id, replyCount: 1 },
    });
    // grandchild is soft-deleted — getTweetReplies filters it out
    await prisma.tweet.create({
      data: { content: "grandchild", authorId: user.id, parentId: child.id, deletedAt: new Date() },
    });

    const { data } = await getReplyChains(root.id);
    expect(data[0].firstChild).not.toBeNull();
    expect(data[0].grandchild).toBeNull();
    expect(data[0].hasMoreGrandchildren).toBe(false);
  });
});
