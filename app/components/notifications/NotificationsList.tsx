"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Avatar from "@/app/components/ui/Avatar";
import { formatTime } from "@/app/lib/utils";
import type { NotificationPayload } from "@/app/lib/sse";
import { getNotifications } from "@/app/actions/notifications";

function NotificationItem({ notif }: { notif: NotificationPayload }) {
  const label =
    notif.type === "LIKE"
      ? "liked your tweet"
      : notif.type === "FOLLOW"
      ? "followed you"
      : "replied to your tweet";

  const href =
    notif.type === "FOLLOW"
      ? `/${notif.actor.username}`
      : notif.tweetId
      ? `/${notif.actor.username}/status/${notif.tweetId}`
      : `/${notif.actor.username}`;

  return (
    <Link
      href={href}
      className={`flex gap-3 px-4 py-3 border-b border-zinc-800 hover:bg-white/[0.03] transition-colors ${!notif.read ? "bg-sky-500/5" : ""}`}
    >
      <Avatar name={notif.actor.name} avatarUrl={notif.actor.avatarUrl} size="md" />
      <div className="flex-1 min-w-0">
        <p className="text-[15px]">
          <span className="font-bold">{notif.actor.name}</span>{" "}
          <span className="text-zinc-400">{label}</span>
        </p>
        {notif.tweetContent && (
          <p className="text-zinc-500 text-sm mt-0.5 line-clamp-2">{notif.tweetContent}</p>
        )}
        <p className="text-zinc-500 text-sm mt-0.5" suppressHydrationWarning>
          {formatTime(notif.createdAt)}
        </p>
      </div>
    </Link>
  );
}

interface NotificationsListProps {
  initialNotifications: NotificationPayload[];
  initialNextCursor: string | null;
}

export default function NotificationsList({ initialNotifications, initialNextCursor }: NotificationsListProps) {
  const [notifications, setNotifications] = useState<NotificationPayload[]>(initialNotifications);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Prepend incoming real-time notifications
  useEffect(() => {
    const handler = (e: Event) => {
      const notif = (e as CustomEvent<NotificationPayload>).detail;
      setNotifications((prev) => (prev.some((n) => n.id === notif.id) ? prev : [notif, ...prev]));
    };
    window.addEventListener("sse:notification", handler);
    return () => window.removeEventListener("sse:notification", handler);
  }, []);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    const result = await getNotifications({ cursor: nextCursor });
    setNotifications((prev) => [...prev, ...result.data]);
    setNextCursor(result.nextCursor);

    loadingRef.current = false;
    setLoading(false);
  }, [nextCursor]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !nextCursor) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loadMore();
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, nextCursor]);

  if (notifications.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
        <p className="font-extrabold text-3xl mb-2">No notifications yet</p>
        <p className="text-zinc-500">When someone likes, follows, or replies, you&apos;ll see it here.</p>
      </div>
    );
  }

  return (
    <>
      {notifications.map((n) => (
        <NotificationItem key={n.id} notif={n} />
      ))}

      <div ref={sentinelRef} className="h-1" />

      {loading && (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-sky-500 animate-spin" />
        </div>
      )}

      {!nextCursor && notifications.length > 0 && (
        <p className="text-center text-zinc-600 text-sm py-8">You&apos;re all caught up</p>
      )}
    </>
  );
}
