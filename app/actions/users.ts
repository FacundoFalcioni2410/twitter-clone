"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/app/lib/db";
import { requireAuth } from "@/app/lib/session";
import type { ActionResult } from "@/app/lib/types";
import { updateProfileSchema } from "@/app/lib/schemas/users";

export async function updateProfile(
  input: z.infer<typeof updateProfileSchema>
): Promise<ActionResult<null>> {
  const session = await requireAuth();
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0].message };

  const { name, bio, avatarUrl, headerUrl } = parsed.data;
  const user = await prisma.user.update({
    where: { id: session.userId },
    data: {
      name,
      bio: bio ?? null,
      ...(avatarUrl !== undefined && { avatarUrl }),
      ...(headerUrl !== undefined && { headerUrl }),
    },
    select: { username: true },
  });

  revalidatePath(`/${user.username}`);
  return { data: null, error: null };
}

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

export async function searchUsers(query: string) {
  const q = query.trim();
  if (!q) return [];

  return prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, username: true, name: true, avatarUrl: true },
    take: 5,
    orderBy: { followersCount: "desc" },
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
      headerUrl: true,
      followersCount: true,
      followingCount: true,
      createdAt: true,
    },
  });
}
