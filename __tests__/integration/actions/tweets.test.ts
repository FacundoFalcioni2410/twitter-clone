import { describe, it, expect, beforeEach, vi } from "vitest";
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

const { createTweet, deleteTweet, getTimeline } = await import(
  "@/app/actions/tweets"
);

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

beforeEach(async () => {
  await prisma.tweet.deleteMany();
  await prisma.user.deleteMany({ where: { email: { contains: "@twtest.com" } } });
  vi.clearAllMocks();
});

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
    expect(dbTweet).toBeNull();
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

describe("getTimeline", () => {
  it("returns tweets ordered newest first", async () => {
    const user = await createUser("tl1");

    await prisma.tweet.create({ data: { content: "first", authorId: user.id } });
    await new Promise((r) => setTimeout(r, 5));
    await prisma.tweet.create({ data: { content: "second", authorId: user.id } });

    const { data } = await getTimeline();
    expect(data[0].content).toBe("second");
    expect(data[1].content).toBe("first");
  });

  it("paginates correctly with cursor", async () => {
    const user = await createUser("tl2");

    for (let i = 0; i < 5; i++) {
      await prisma.tweet.create({ data: { content: `tweet ${i}`, authorId: user.id } });
      await new Promise((r) => setTimeout(r, 2));
    }

    // Fetch only 3 tweets by overriding PAGE_SIZE — instead, verify cursor works
    const first = await getTimeline();
    expect(first.data.length).toBe(5);
    expect(first.nextCursor).toBeNull(); // fewer than PAGE_SIZE (20)

    // Use cursor from a mid-point
    const midId = first.data[2].id;
    const second = await getTimeline({ cursor: midId });
    expect(second.data.length).toBe(2);
    expect(second.data[0].id).toBe(first.data[3].id);
  });

  it("returns nextCursor when more than PAGE_SIZE tweets exist", async () => {
    const user = await createUser("tl3");

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
    const user = await createUser("tl4");
    await prisma.tweet.create({ data: { content: "hello", authorId: user.id } });

    const { data } = await getTimeline();
    expect(data[0].author.username).toBe(user.username);
    expect(data[0].author.name).toBe(user.name);
  });
});
