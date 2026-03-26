import { prisma } from "@/app/lib/db";

export async function getSuggestedUsers(excludeUserId: string) {
  return prisma.user.findMany({
    where: { id: { not: excludeUserId } },
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
      createdAt: true,
    },
  });
}
