"use server";

import { prisma } from "@/app/lib/db";
import { requireAuth, getCurrentUser } from "@/app/lib/session";
import { tweetSchema } from "@/app/lib/schemas/tweets";
const PAGE_SIZE = 20;

const authorSelect = {
  id: true,
  username: true,
  name: true,
  avatarUrl: true,
} as const;

export type TweetAuthor = {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
};

export type Tweet = {
  id: string;
  content: string;
  likeCount: number;
  replyCount: number;
  parentId: string | null;
  isLiked: boolean;
  deleted: boolean;
  createdAt: string;
  author: TweetAuthor;
};

async function getLikedSet(tweetIds: string[], userId: string): Promise<Set<string>> {
  if (tweetIds.length === 0) return new Set();
  const likes = await prisma.like.findMany({
    where: { userId, tweetId: { in: tweetIds } },
    select: { tweetId: true },
  });
  return new Set(likes.map((l) => l.tweetId));
}

function toTweet(
  t: { id: string; content: string; likeCount: number; replyCount: number; parentId: string | null; deletedAt: Date | null; createdAt: Date; author: TweetAuthor; updatedAt: Date; authorId: string },
  likedSet: Set<string>
): Tweet {
  return {
    id: t.id,
    content: t.content,
    likeCount: t.likeCount,
    replyCount: t.replyCount,
    parentId: t.parentId,
    deleted: t.deletedAt !== null,
    isLiked: likedSet.has(t.id),
    createdAt: t.createdAt.toISOString(),
    author: t.author,
  };
}


export async function createTweet(content: string) {
  const session = await requireAuth();

  const result = tweetSchema.safeParse({ content });
  if (!result.success) {
    return { data: null, error: result.error.issues[0].message };
  }

  const tweet = await prisma.tweet.create({
    data: { content: result.data.content, authorId: session.userId },
    include: { author: { select: authorSelect } },
  });

  return { data: toTweet(tweet, new Set()), error: null };
}

export async function createReply(parentId: string, content: string) {
  const session = await requireAuth();

  const result = tweetSchema.safeParse({ content });
  if (!result.success) return { data: null, error: result.error.issues[0].message };

  const parent = await prisma.tweet.findUnique({
    where: { id: parentId, deletedAt: null },
    select: { id: true },
  });
  if (!parent) return { data: null, error: "Tweet not found" };

  const tweet = await prisma.$transaction(async (tx) => {
    const created = await tx.tweet.create({
      data: { content: result.data.content, authorId: session.userId, parentId },
      include: { author: { select: authorSelect } },
    });
    await tx.tweet.update({
      where: { id: parentId },
      data: { replyCount: { increment: 1 } },
    });
    return created;
  });

  return { data: toTweet(tweet, new Set()), error: null };
}

export async function deleteTweet(tweetId: string) {
  const session = await requireAuth();

  const tweet = await prisma.tweet.findUnique({
    where: { id: tweetId, deletedAt: null },
    select: { authorId: true, parentId: true, replyCount: true },
  });

  if (!tweet) return { data: null, error: "Tweet not found" };
  if (tweet.authorId !== session.userId) return { data: null, error: "Not authorized" };

  await prisma.$transaction(async (tx) => {
    await tx.tweet.update({
      where: { id: tweetId },
      data: { deletedAt: new Date() },
    });
    // Only decrement parent's replyCount for leaf replies — if this tweet has
    // children, the thread remains visible as a placeholder.
    if (tweet.parentId && tweet.replyCount === 0) {
      await tx.tweet.update({
        where: { id: tweet.parentId },
        data: { replyCount: { decrement: 1 } },
      });
    }
  });

  return { data: true, error: null };
}

export async function getTweetById(tweetId: string) {
  const [session, tweet] = await Promise.all([
    getCurrentUser(),
    prisma.tweet.findUnique({
      where: { id: tweetId },
      include: { author: { select: authorSelect } },
    }),
  ]);
  if (!tweet) return null;
  const likedSet =
    !tweet.deletedAt && session
      ? await getLikedSet([tweet.id], session.userId)
      : new Set<string>();
  return toTweet(tweet, likedSet);
}

export async function getTweetReplies(tweetId: string, opts?: { cursor?: string; limit?: number }) {
  const limit = opts?.limit ?? PAGE_SIZE;
  const [session, replies] = await Promise.all([
    getCurrentUser(),
    prisma.tweet.findMany({
      where: { parentId: tweetId, deletedAt: null },
      ...(opts?.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
      take: limit + 1,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      include: { author: { select: authorSelect } },
    }),
  ]);

  const page = replies.length > limit ? replies.slice(0, limit) : replies;
  const likedSet = session ? await getLikedSet(page.map((t) => t.id), session.userId) : new Set<string>();
  const data = page.map((t) => toTweet(t, likedSet));
  const nextCursor = replies.length > limit ? data[data.length - 1].id : null;

  return { data, nextCursor };
}

export async function getParentChain(tweetId: string): Promise<Tweet[]> {
  const session = await getCurrentUser();

  const start = await prisma.tweet.findUnique({ where: { id: tweetId }, select: { parentId: true } });
  let currentId = start?.parentId ?? null;

  const chain: Array<{ id: string; content: string; likeCount: number; replyCount: number; parentId: string | null; deletedAt: Date | null; createdAt: Date; updatedAt: Date; authorId: string; author: TweetAuthor }> = [];

  while (currentId) {
    const tweet = await prisma.tweet.findUnique({
      where: { id: currentId },
      include: { author: { select: authorSelect } },
    });
    if (!tweet) break;
    chain.unshift(tweet);
    currentId = tweet.parentId;
  }

  if (chain.length === 0) return [];

  const aliveTweetIds = chain.filter((t) => !t.deletedAt).map((t) => t.id);
  const likedSet = session && aliveTweetIds.length > 0
    ? await getLikedSet(aliveTweetIds, session.userId)
    : new Set<string>();

  return chain.map((t) => toTweet(t, likedSet));
}

export async function getUserTweets(userId: string, opts?: { cursor?: string }) {
  const [session, tweets] = await Promise.all([
    getCurrentUser(),
    prisma.tweet.findMany({
      where: { authorId: userId, parentId: null, deletedAt: null },
      ...(opts?.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
      take: PAGE_SIZE + 1,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: { author: { select: authorSelect } },
    }),
  ]);

  const page = tweets.length > PAGE_SIZE ? tweets.slice(0, PAGE_SIZE) : tweets;
  const likedSet = session ? await getLikedSet(page.map((t) => t.id), session.userId) : new Set<string>();
  const data = page.map((t) => toTweet(t, likedSet));
  const nextCursor = tweets.length > PAGE_SIZE ? data[data.length - 1].id : null;

  return { data, nextCursor };
}

export async function getLikedTweets(userId: string, opts?: { cursor?: string }) {
  const [session, likes] = await Promise.all([
    getCurrentUser(),
    prisma.like.findMany({
      where: { userId, tweet: { deletedAt: null } },
      ...(opts?.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
      take: PAGE_SIZE + 1,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: { tweet: { include: { author: { select: authorSelect } } } },
    }),
  ]);

  const page = likes.length > PAGE_SIZE ? likes.slice(0, PAGE_SIZE) : likes;
  const likedSet = session
    ? await getLikedSet(page.map((l) => l.tweetId), session.userId)
    : new Set<string>();
  const data = page.map((l) => toTweet(l.tweet, likedSet));
  const nextCursor = likes.length > PAGE_SIZE ? page[page.length - 1].id : null;

  return { data, nextCursor };
}

export type ReplyChain = {
  tweet: Tweet;
  firstChild: Tweet | null;
  hasMoreSiblings: boolean;
  grandchild: Tweet | null;
  hasMoreGrandchildren: boolean;
};

export async function getReplyChains(
  tweetId: string,
  opts?: { cursor?: string; limit?: number }
): Promise<{ data: ReplyChain[]; nextCursor: string | null }> {
  const { data: replies, nextCursor } = await getTweetReplies(tweetId, opts);

  const chains = await Promise.all(
    replies.map(async (reply) => {
      if (reply.replyCount === 0) {
        return { tweet: reply, firstChild: null, hasMoreSiblings: false, grandchild: null, hasMoreGrandchildren: false };
      }
      const { data: children, nextCursor: siblingCursor } = await getTweetReplies(reply.id, { limit: 1 });
      const firstChild = children[0] ?? null;

      if (!firstChild || firstChild.replyCount === 0) {
        return { tweet: reply, firstChild, hasMoreSiblings: siblingCursor !== null, grandchild: null, hasMoreGrandchildren: false };
      }

      const { data: grandchildren, nextCursor: grandCursor } = await getTweetReplies(firstChild.id, { limit: 1 });
      return {
        tweet: reply,
        firstChild,
        hasMoreSiblings: siblingCursor !== null,
        grandchild: grandchildren[0] ?? null,
        hasMoreGrandchildren: grandCursor !== null || (grandchildren[0]?.replyCount ?? 0) > 0,
      };
    })
  );

  return { data: chains, nextCursor };
}

export async function getTimeline(opts?: { cursor?: string }) {
  const session = await getCurrentUser();

  const followingIds = session
    ? (
        await prisma.follow.findMany({
          where: { followerId: session.userId },
          select: { followingId: true },
        })
      ).map((f) => f.followingId)
    : [];

  const tweets = await prisma.tweet.findMany({
    where: {
      authorId: { in: [...followingIds, ...(session ? [session.userId] : [])] },
      parentId: null,
      deletedAt: null,
    },
    ...(opts?.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    take: PAGE_SIZE + 1,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: { author: { select: authorSelect } },
  });

  const page = tweets.length > PAGE_SIZE ? tweets.slice(0, PAGE_SIZE) : tweets;
  const likedSet = session ? await getLikedSet(page.map((t) => t.id), session.userId) : new Set<string>();
  const data = page.map((t) => toTweet(t, likedSet));
  const nextCursor = tweets.length > PAGE_SIZE ? data[data.length - 1].id : null;

  return { data, nextCursor };
}
