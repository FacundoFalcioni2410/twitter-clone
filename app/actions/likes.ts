"use server";

import { prisma } from "@/app/lib/db";
import { requireAuth } from "@/app/lib/session";
import { broadcastLike } from "@/app/lib/sse";

export async function getTweetLikes(tweetId: string) {
  const likes = await prisma.like.findMany({
    where: { tweetId },
    include: { user: { select: { id: true, username: true, name: true, avatarUrl: true, bio: true } } },
    orderBy: { createdAt: "desc" },
  });
  return likes.map((l) => l.user);
}

export async function likeTweet(tweetId: string) {
  const session = await requireAuth();

  const exists = await prisma.like.findUnique({
    where: { userId_tweetId: { userId: session.userId, tweetId } },
  });

  if (exists) return { data: null, error: "Already liked" };

  const [, updated] = await prisma.$transaction([
    prisma.like.create({ data: { userId: session.userId, tweetId } }),
    prisma.tweet.update({ where: { id: tweetId }, data: { likeCount: { increment: 1 } }, select: { likeCount: true } }),
  ]);

  broadcastLike(tweetId, updated.likeCount);
  return { data: true, error: null };
}

export async function unlikeTweet(tweetId: string) {
  const session = await requireAuth();

  const exists = await prisma.like.findUnique({
    where: { userId_tweetId: { userId: session.userId, tweetId } },
  });

  if (!exists) return { data: null, error: "Not liked" };

  const [, updated] = await prisma.$transaction([
    prisma.like.delete({ where: { userId_tweetId: { userId: session.userId, tweetId } } }),
    prisma.tweet.update({ where: { id: tweetId }, data: { likeCount: { decrement: 1 } }, select: { likeCount: true } }),
  ]);

  broadcastLike(tweetId, updated.likeCount);
  return { data: true, error: null };
}
