"use server";

import { prisma } from "@/app/lib/db";
import { requireAuth, getCurrentUser } from "@/app/lib/session";
import { createNotification } from "@/app/actions/notifications";

const userSelect = {
  id: true,
  username: true,
  name: true,
  bio: true,
  avatarUrl: true,
} as const;

export async function followUser(targetUserId: string) {
  const session = await requireAuth();

  if (session.userId === targetUserId) {
    return { data: null, error: "Cannot follow yourself" };
  }

  const exists = await prisma.follow.findUnique({
    where: {
      followerId_followingId: { followerId: session.userId, followingId: targetUserId },
    },
  });

  if (exists) return { data: null, error: "Already following" };

  await prisma.$transaction([
    prisma.follow.create({
      data: { followerId: session.userId, followingId: targetUserId },
    }),
    prisma.user.update({
      where: { id: session.userId },
      data: { followingCount: { increment: 1 } },
    }),
    prisma.user.update({
      where: { id: targetUserId },
      data: { followersCount: { increment: 1 } },
    }),
  ]);

  void createNotification({ type: "FOLLOW", recipientId: targetUserId, actorId: session.userId });
  return { data: true, error: null };
}

export async function unfollowUser(targetUserId: string) {
  const session = await requireAuth();

  const exists = await prisma.follow.findUnique({
    where: {
      followerId_followingId: { followerId: session.userId, followingId: targetUserId },
    },
  });

  if (!exists) return { data: null, error: "Not following" };

  await prisma.$transaction([
    prisma.follow.delete({
      where: {
        followerId_followingId: { followerId: session.userId, followingId: targetUserId },
      },
    }),
    prisma.user.update({
      where: { id: session.userId },
      data: { followingCount: { decrement: 1 } },
    }),
    prisma.user.update({
      where: { id: targetUserId },
      data: { followersCount: { decrement: 1 } },
    }),
  ]);

  return { data: true, error: null };
}

export async function getIsFollowing(targetUserId: string): Promise<boolean> {
  const session = await getCurrentUser();
  if (!session) return false;

  const follow = await prisma.follow.findUnique({
    where: {
      followerId_followingId: { followerId: session.userId, followingId: targetUserId },
    },
  });

  return !!follow;
}

export async function getFollowers(userId: string) {
  const session = await getCurrentUser();

  const follows = await prisma.follow.findMany({
    where: { followingId: userId },
    include: { follower: { select: userSelect } },
    orderBy: { createdAt: "desc" },
  });

  if (!session) {
    return follows.map((f) => ({ ...f.follower, isFollowing: false, isFollowingViewer: false }));
  }

  const [viewerFollowing, viewerFollowers] = await Promise.all([
    prisma.follow.findMany({ where: { followerId: session.userId }, select: { followingId: true } }),
    prisma.follow.findMany({ where: { followingId: session.userId }, select: { followerId: true } }),
  ]);
  const viewerFollowingSet = new Set(viewerFollowing.map((f) => f.followingId));
  const viewerFollowersSet = new Set(viewerFollowers.map((f) => f.followerId));

  return follows.map((f) => ({
    ...f.follower,
    isFollowing: viewerFollowingSet.has(f.follower.id),
    isFollowingViewer: viewerFollowersSet.has(f.follower.id),
  }));
}

export async function getFollowing(userId: string) {
  const session = await getCurrentUser();

  const follows = await prisma.follow.findMany({
    where: { followerId: userId },
    include: { following: { select: userSelect } },
    orderBy: { createdAt: "desc" },
  });

  if (!session) {
    return follows.map((f) => ({ ...f.following, isFollowing: false, isFollowingViewer: false }));
  }

  const [viewerFollowing, viewerFollowers] = await Promise.all([
    prisma.follow.findMany({ where: { followerId: session.userId }, select: { followingId: true } }),
    prisma.follow.findMany({ where: { followingId: session.userId }, select: { followerId: true } }),
  ]);
  const viewerFollowingSet = new Set(viewerFollowing.map((f) => f.followingId));
  const viewerFollowersSet = new Set(viewerFollowers.map((f) => f.followerId));

  return follows.map((f) => ({
    ...f.following,
    isFollowing: viewerFollowingSet.has(f.following.id),
    isFollowingViewer: viewerFollowersSet.has(f.following.id),
  }));
}
