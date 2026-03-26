import { prisma } from "@/app/lib/db";

export async function getSuggestedUsers(currentUserId: string) {
  const alreadyFollowing = await prisma.follow.findMany({
    where: { followerId: currentUserId },
    select: { followingId: true },
  });

  const excludeIds = [currentUserId, ...alreadyFollowing.map((f) => f.followingId)];

  return prisma.user.findMany({
    where: { id: { notIn: excludeIds } },
    select: { id: true, username: true, name: true, avatarUrl: true },
    take: 3,
    orderBy: { createdAt: "desc" },
  });
}

export async function getUserByUsername(username: string) {
  return prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      name: true,
      bio: true,
      avatarUrl: true,
      followersCount: true,
      followingCount: true,
      createdAt: true,
    },
  });
}
