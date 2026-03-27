import { describe, it, expect, beforeEach, vi } from "vitest";

// Reset the globalThis registry before each test so tests are isolated.
beforeEach(() => {
  const g = globalThis as typeof globalThis & { _sseClients?: unknown };
  delete g._sseClients;
  vi.resetModules();
});

async function importSSE() {
  return import("@/app/lib/sse");
}

describe("globalThis._sseClients", () => {
  it("reuses an existing Set instead of creating a new one", async () => {
    // Simulate another module instance having already initialised the registry
    const existingSet = new Set<unknown>();
    (globalThis as Record<string, unknown>)._sseClients = existingSet;

    const { addSSEClient } = await importSSE();
    const enqueue = vi.fn();
    addSSEClient({ userId: "u1", enqueue });

    expect(existingSet.size).toBe(1);
  });
});

describe("addSSEClient", () => {
  it("registers a client and returns a cleanup function", async () => {
    const { addSSEClient, broadcastLike } = await importSSE();
    const enqueue = vi.fn();
    const remove = addSSEClient({ userId: "u1", enqueue });

    broadcastLike("t1", 5);
    expect(enqueue).toHaveBeenCalledOnce();
    expect(enqueue.mock.calls[0][0]).toContain('"likeCount":5');

    remove();
    broadcastLike("t1", 6);
    expect(enqueue).toHaveBeenCalledOnce(); // no second call
  });

  it("removes a dead client that throws on enqueue", async () => {
    const { addSSEClient, broadcastLike } = await importSSE();
    const bad = vi.fn().mockImplementation(() => { throw new Error("closed"); });
    const good = vi.fn();
    addSSEClient({ userId: "u1", enqueue: bad });
    addSSEClient({ userId: "u2", enqueue: good });

    broadcastLike("t1", 1);

    expect(bad).toHaveBeenCalledOnce();
    expect(good).toHaveBeenCalledOnce();

    // bad client should have been removed — second broadcast skips it
    broadcastLike("t1", 2);
    expect(bad).toHaveBeenCalledOnce(); // still only once
    expect(good).toHaveBeenCalledTimes(2);
  });
});

describe("broadcastLike", () => {
  it("sends correct SSE event format", async () => {
    const { addSSEClient, broadcastLike } = await importSSE();
    const enqueue = vi.fn();
    addSSEClient({ userId: "u1", enqueue });

    broadcastLike("tweet-abc", 42);

    expect(enqueue).toHaveBeenCalledWith(
      'event: like\ndata: {"tweetId":"tweet-abc","likeCount":42}\n\n'
    );
  });

  it("is a no-op when no clients are connected", async () => {
    const { broadcastLike } = await importSSE();
    // Should not throw
    expect(() => broadcastLike("t1", 1)).not.toThrow();
  });

  it("broadcasts to all connected clients", async () => {
    const { addSSEClient, broadcastLike } = await importSSE();
    const a = vi.fn();
    const b = vi.fn();
    const c = vi.fn();
    addSSEClient({ userId: "u1", enqueue: a });
    addSSEClient({ userId: "u2", enqueue: b });
    addSSEClient({ userId: "u3", enqueue: c });

    broadcastLike("t1", 3);

    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
    expect(c).toHaveBeenCalledOnce();
  });
});

describe("broadcastReplyCount", () => {
  it("sends correct SSE event format", async () => {
    const { addSSEClient, broadcastReplyCount } = await importSSE();
    const enqueue = vi.fn();
    addSSEClient({ userId: "u1", enqueue });

    broadcastReplyCount("tweet-xyz", 7);

    expect(enqueue).toHaveBeenCalledWith(
      'event: replyCount\ndata: {"tweetId":"tweet-xyz","replyCount":7}\n\n'
    );
  });

  it("is a no-op when no clients are connected", async () => {
    const { broadcastReplyCount } = await importSSE();
    expect(() => broadcastReplyCount("t1", 0)).not.toThrow();
  });
});

describe("broadcastTweet", () => {
  it("is a no-op when no clients are connected", async () => {
    const { broadcastTweet } = await importSSE();
    const tweet = {
      id: "t1", content: "hello", likeCount: 0, replyCount: 0,
      parentId: null, isLiked: false, deleted: false,
      createdAt: new Date().toISOString(),
      author: { id: "u1", username: "alice", name: "Alice", avatarUrl: null },
    };
    await expect(broadcastTweet(tweet)).resolves.toBeUndefined();
  });

  it("removes a dead client that throws during broadcastTweet", async () => {
    vi.doMock("@/app/lib/db", () => ({
      prisma: {
        follow: { findMany: vi.fn().mockResolvedValue([]) },
      },
    }));

    const { addSSEClient, broadcastTweet } = await importSSE();
    const bad = vi.fn().mockImplementation(() => { throw new Error("closed"); });
    const good = vi.fn();
    addSSEClient({ userId: "author1", enqueue: bad });
    addSSEClient({ userId: "author1", enqueue: good }); // second client for same user

    const tweet = {
      id: "t1", content: "hello", likeCount: 0, replyCount: 0,
      parentId: null, isLiked: false, deleted: false,
      createdAt: new Date().toISOString(),
      author: { id: "author1", username: "alice", name: "Alice", avatarUrl: null },
    };
    await broadcastTweet(tweet);

    expect(bad).toHaveBeenCalledOnce();
    expect(good).toHaveBeenCalledOnce();

    // bad client removed — second broadcast skips it
    await broadcastTweet(tweet);
    expect(bad).toHaveBeenCalledOnce();
    expect(good).toHaveBeenCalledTimes(2);
  });

  it("sends only to the author and their followers", async () => {
    // Mock prisma so we don't need a real DB
    vi.doMock("@/app/lib/db", () => ({
      prisma: {
        follow: {
          findMany: vi.fn().mockResolvedValue([{ followerId: "follower1" }]),
        },
      },
    }));

    const { addSSEClient, broadcastTweet } = await importSSE();
    const author = vi.fn();
    const follower = vi.fn();
    const stranger = vi.fn();
    addSSEClient({ userId: "author1", enqueue: author });
    addSSEClient({ userId: "follower1", enqueue: follower });
    addSSEClient({ userId: "stranger1", enqueue: stranger });

    const tweet = {
      id: "t1", content: "hello", likeCount: 0, replyCount: 0,
      parentId: null, isLiked: false, deleted: false,
      createdAt: new Date().toISOString(),
      author: { id: "author1", username: "alice", name: "Alice", avatarUrl: null },
    };
    await broadcastTweet(tweet);

    expect(author).toHaveBeenCalledOnce();
    expect(follower).toHaveBeenCalledOnce();
    expect(stranger).not.toHaveBeenCalled();

    const payload = author.mock.calls[0][0] as string;
    expect(payload).toContain("event: tweet");
    expect(payload).toContain('"id":"t1"');
  });
});
