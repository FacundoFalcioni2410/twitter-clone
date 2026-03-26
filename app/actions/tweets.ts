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
  isLiked: boolean;
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

function toTweet(t: { id: string; content: string; likeCount: number; createdAt: Date; author: TweetAuthor; updatedAt: Date; authorId: string }, likedSet: Set<string>): Tweet {
  return {
    id: t.id,
    content: t.content,
    likeCount: t.likeCount,
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

  return {
    data: toTweet(tweet, new Set()),
    error: null,
  };
}

export async function deleteTweet(tweetId: string) {
  const session = await requireAuth();

  const tweet = await prisma.tweet.findUnique({
    where: { id: tweetId },
    select: { authorId: true },
  });

  if (!tweet) return { data: null, error: "Tweet not found" };
  if (tweet.authorId !== session.userId) {
    return { data: null, error: "Not authorized" };
  }

  await prisma.tweet.delete({ where: { id: tweetId } });
  return { data: true, error: null };
}

export async function getUserTweets(userId: string, opts?: { cursor?: string }) {
  const [session, tweets] = await Promise.all([
    getCurrentUser(),
    prisma.tweet.findMany({
      where: { authorId: userId },
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
      where: { userId },
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
    where: { authorId: { in: [...followingIds, ...(session ? [session.userId] : [])] } },
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
