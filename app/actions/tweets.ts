"use server";

import { prisma } from "@/app/lib/db";
import { requireAuth } from "@/app/lib/session";
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
  createdAt: string;
  author: TweetAuthor;
};

export async function createTweet(content: string) {
  const session = await requireAuth();

  const result = tweetSchema.safeParse({ content });
  if (!result.success) {
    return { data: null, error: result.error.issues[0].message };
  }

  const tweet = await prisma.tweet.create({
    data: {
      content: result.data.content,
      authorId: session.userId,
    },
    include: {
      author: { select: authorSelect },
    },
  });

  return {
    data: { ...tweet, createdAt: tweet.createdAt.toISOString() } as Tweet,
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
  const tweets = await prisma.tweet.findMany({
    where: { authorId: userId },
    ...(opts?.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    take: PAGE_SIZE + 1,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: {
      author: { select: authorSelect },
    },
  });

  const hasMore = tweets.length > PAGE_SIZE;
  const data = (hasMore ? tweets.slice(0, PAGE_SIZE) : tweets).map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
  })) as Tweet[];

  const nextCursor = hasMore ? data[data.length - 1].id : null;
  return { data, nextCursor };
}

export async function getTimeline(opts?: { cursor?: string }) {
  const tweets = await prisma.tweet.findMany({
    ...(opts?.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    take: PAGE_SIZE + 1,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: {
      author: { select: authorSelect },
    },
  });

  const hasMore = tweets.length > PAGE_SIZE;
  const data = (hasMore ? tweets.slice(0, PAGE_SIZE) : tweets).map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
  })) as Tweet[];

  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return { data, nextCursor };
}
