import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { prisma } from "@/app/lib/db";
import { signToken } from "@/app/lib/auth";

const mockBroadcastNotification = vi.fn();
vi.mock("@/app/lib/sse", () => ({
  broadcastNotification: mockBroadcastNotification,
  broadcastLike: vi.fn(),
}));

const mockCookieStore = { set: vi.fn(), delete: vi.fn(), get: vi.fn() };
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const { getNotifications, getUnreadCount, markAllRead, createNotification } =
  await import("@/app/actions/notifications");

// ── helpers ───────────────────────────────────────────────────────────────────

async function createUser(suffix: string) {
  return prisma.user.create({
    data: {
      email: `user_${suffix}@notiftest.com`,
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

async function cleanup() {
  await prisma.notification.deleteMany({ where: { recipient: { email: { contains: "@notiftest.com" } } } });
  await prisma.tweet.deleteMany({ where: { author: { email: { contains: "@notiftest.com" } } } });
  await prisma.user.deleteMany({ where: { email: { contains: "@notiftest.com" } } });
}

beforeEach(async () => {
  await cleanup();
  mockCookieStore.get.mockReset();
  mockBroadcastNotification.mockReset();
});

afterAll(cleanup);

// ── getNotifications ──────────────────────────────────────────────────────────

describe("getNotifications", () => {
  it("returns notifications newest first", async () => {
    const alice = await createUser("gn1a");
    const bob = await createUser("gn1b");
    const tweet = await createTweet(alice.id);
    await mockSession(alice.id, alice.username);

    await createNotification({ type: "LIKE", recipientId: alice.id, actorId: bob.id, tweetId: tweet.id, tweetContent: tweet.content });
    await createNotification({ type: "FOLLOW", recipientId: alice.id, actorId: bob.id });

    const { data, nextCursor } = await getNotifications();

    expect(data).toHaveLength(2);
    expect(data[0].type).toBe("FOLLOW"); // newest first
    expect(data[1].type).toBe("LIKE");
    expect(nextCursor).toBeNull();
  });

  it("maps fields correctly", async () => {
    const alice = await createUser("gn2a");
    const bob = await createUser("gn2b");
    const tweet = await createTweet(alice.id);
    await mockSession(alice.id, alice.username);

    await createNotification({ type: "REPLY", recipientId: alice.id, actorId: bob.id, tweetId: tweet.id, tweetContent: "reply text" });

    const { data } = await getNotifications();
    const notif = data[0];

    expect(notif.type).toBe("REPLY");
    expect(notif.actor.id).toBe(bob.id);
    expect(notif.actor.username).toBe(bob.username);
    expect(notif.tweetId).toBe(tweet.id);
    expect(notif.tweetContent).toBe(tweet.content);
    expect(notif.read).toBe(false);
    expect(typeof notif.createdAt).toBe("string");
  });

  it("returns nextCursor when there are more than PAGE_SIZE notifications", async () => {
    const alice = await createUser("gn3a");
    const bob = await createUser("gn3b");
    await mockSession(alice.id, alice.username);

    for (let i = 0; i < 21; i++) {
      await prisma.notification.create({
        data: { type: "FOLLOW", recipientId: alice.id, actorId: bob.id },
      });
    }

    const { data, nextCursor } = await getNotifications();
    expect(data).toHaveLength(20);
    expect(nextCursor).not.toBeNull();
  });

  it("respects cursor for pagination", async () => {
    const alice = await createUser("gn4a");
    const bob = await createUser("gn4b");
    await mockSession(alice.id, alice.username);

    for (let i = 0; i < 21; i++) {
      await prisma.notification.create({
        data: { type: "FOLLOW", recipientId: alice.id, actorId: bob.id },
      });
    }

    const first = await getNotifications();
    const second = await getNotifications({ cursor: first.nextCursor! });

    expect(second.data).toHaveLength(1);
    expect(second.nextCursor).toBeNull();
  });
});

// ── getUnreadCount ────────────────────────────────────────────────────────────

describe("getUnreadCount", () => {
  it("returns 0 when not authenticated", async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const count = await getUnreadCount();
    expect(count).toBe(0);
  });

  it("returns count of unread notifications", async () => {
    const alice = await createUser("uc1a");
    const bob = await createUser("uc1b");
    await mockSession(alice.id, alice.username);

    await prisma.notification.createMany({
      data: [
        { type: "LIKE", recipientId: alice.id, actorId: bob.id, read: false },
        { type: "FOLLOW", recipientId: alice.id, actorId: bob.id, read: false },
        { type: "REPLY", recipientId: alice.id, actorId: bob.id, read: true },
      ],
    });

    const count = await getUnreadCount();
    expect(count).toBe(2);
  });
});

// ── markAllRead ───────────────────────────────────────────────────────────────

describe("markAllRead", () => {
  it("marks all unread notifications as read", async () => {
    const alice = await createUser("mr1a");
    const bob = await createUser("mr1b");
    await mockSession(alice.id, alice.username);

    await prisma.notification.createMany({
      data: [
        { type: "LIKE", recipientId: alice.id, actorId: bob.id, read: false },
        { type: "FOLLOW", recipientId: alice.id, actorId: bob.id, read: false },
      ],
    });

    const result = await markAllRead();
    expect(result).toEqual({ data: true, error: null });

    const unread = await prisma.notification.count({
      where: { recipientId: alice.id, read: false },
    });
    expect(unread).toBe(0);
  });
});

// ── createNotification ────────────────────────────────────────────────────────

describe("createNotification", () => {
  it("creates a notification in the DB and broadcasts it", async () => {
    const alice = await createUser("cn1a");
    const bob = await createUser("cn1b");
    const tweet = await createTweet(alice.id);

    await createNotification({ type: "LIKE", recipientId: alice.id, actorId: bob.id, tweetId: tweet.id, tweetContent: tweet.content });

    const notif = await prisma.notification.findFirst({
      where: { recipientId: alice.id, actorId: bob.id },
    });
    expect(notif).not.toBeNull();
    expect(notif!.type).toBe("LIKE");
    expect(notif!.tweetId).toBe(tweet.id);

    expect(mockBroadcastNotification).toHaveBeenCalledOnce();
    const [recipientId, payload] = mockBroadcastNotification.mock.calls[0];
    expect(recipientId).toBe(alice.id);
    expect(payload.type).toBe("LIKE");
    expect(payload.actor.id).toBe(bob.id);
    expect(payload.tweetContent).toBe(tweet.content);
  });

  it("skips self-notifications", async () => {
    const alice = await createUser("cn2");

    await createNotification({ type: "LIKE", recipientId: alice.id, actorId: alice.id });

    const count = await prisma.notification.count({ where: { recipientId: alice.id } });
    expect(count).toBe(0);
    expect(mockBroadcastNotification).not.toHaveBeenCalled();
  });

  it("skips when actor does not exist", async () => {
    const alice = await createUser("cn3");

    await createNotification({ type: "FOLLOW", recipientId: alice.id, actorId: "nonexistent-id" });

    const count = await prisma.notification.count({ where: { recipientId: alice.id } });
    expect(count).toBe(0);
    expect(mockBroadcastNotification).not.toHaveBeenCalled();
  });
});
