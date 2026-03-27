"use server";

import { prisma } from "@/app/lib/db";
import { requireAuth, getCurrentUser } from "@/app/lib/session";
import { broadcastNotification } from "@/app/lib/sse";
import type { NotificationPayload } from "@/app/lib/types";

const PAGE_SIZE = 20;

const actorSelect = {
  id: true,
  username: true,
  name: true,
  avatarUrl: true,
} as const;

export async function getNotifications(opts?: { cursor?: string }) {
  const session = await requireAuth();

  const notifications = await prisma.notification.findMany({
    where: { recipientId: session.userId },
    ...(opts?.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    take: PAGE_SIZE + 1,
    orderBy: { createdAt: "desc" },
    include: {
      actor: { select: actorSelect },
      tweet: { select: { id: true, content: true } },
    },
  });

  const page = notifications.length > PAGE_SIZE ? notifications.slice(0, PAGE_SIZE) : notifications;
  const nextCursor = notifications.length > PAGE_SIZE ? page[page.length - 1].id : null;

  const data: NotificationPayload[] = page.map((n) => ({
    id: n.id,
    type: n.type,
    actor: n.actor,
    tweetId: n.tweetId,
    tweetContent: n.tweet?.content ?? null,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  }));

  return { data, nextCursor };
}

export async function getUnreadCount(): Promise<number> {
  const session = await getCurrentUser();
  if (!session) return 0;
  return prisma.notification.count({
    where: { recipientId: session.userId, read: false },
  });
}

export async function markAllRead() {
  const session = await requireAuth();
  await prisma.notification.updateMany({
    where: { recipientId: session.userId, read: false },
    data: { read: true },
  });
  return { data: true, error: null };
}

// Internal helper — not exported as an action callable from the client.
// Called from other server actions (likes, follows, tweets).
export async function createNotification(params: {
  type: "LIKE" | "FOLLOW" | "REPLY";
  recipientId: string;
  actorId: string;
  tweetId?: string | null;
  tweetContent?: string | null;
}) {
  if (params.recipientId === params.actorId) return;

  const actor = await prisma.user.findUnique({
    where: { id: params.actorId },
    select: actorSelect,
  });
  if (!actor) return;

  const notification = await prisma.notification.create({
    data: {
      type: params.type,
      recipientId: params.recipientId,
      actorId: params.actorId,
      tweetId: params.tweetId ?? null,
    },
  });

  broadcastNotification(params.recipientId, {
    id: notification.id,
    type: params.type,
    actor,
    tweetId: params.tweetId ?? null,
    tweetContent: params.tweetContent ?? null,
    read: false,
    createdAt: notification.createdAt.toISOString(),
  });
}
