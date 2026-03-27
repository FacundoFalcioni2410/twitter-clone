"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/app/components/ui/Avatar";
import type { NotificationPayload } from "@/app/lib/types";

const TOAST_DURATION = 4500;

type ToastItem = NotificationPayload & { key: number };

function label(type: NotificationPayload["type"]) {
  if (type === "LIKE") return "liked your tweet";
  if (type === "FOLLOW") return "followed you";
  return "replied to your tweet";
}

function href(notif: NotificationPayload) {
  if (notif.type === "FOLLOW") return `/${notif.actor.username}`;
  if (notif.tweetId) return `/${notif.actor.username}/status/${notif.tweetId}`;
  return `/${notif.actor.username}`;
}

export default function NotificationToast() {
  const router = useRouter();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const keyRef = { current: 0 };

  const dismiss = useCallback((key: number) => {
    setToasts((prev) => prev.filter((t) => t.key !== key));
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const notif = (e as CustomEvent<NotificationPayload>).detail;
      const key = ++keyRef.current;
      setToasts((prev) => [...prev, { ...notif, key }]);
      setTimeout(() => dismiss(key), TOAST_DURATION);
    };
    window.addEventListener("sse:notification", handler);
    return () => window.removeEventListener("sse:notification", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <button
          key={toast.key}
          onClick={() => {
            dismiss(toast.key);
            router.push(href(toast));
          }}
          className="pointer-events-auto flex items-center gap-3 bg-sky-500 text-white pl-3 pr-4 py-2.5 rounded-full shadow-lg text-sm font-medium max-w-xs animate-fade-in hover:bg-sky-400 transition-colors"
        >
          <Avatar name={toast.actor.name} avatarUrl={toast.actor.avatarUrl} size="xs" />
          <span className="truncate">
            <span className="font-bold">{toast.actor.name}</span>{" "}
            {label(toast.type)}
          </span>
          <span
            role="button"
            aria-label="Dismiss"
            onClick={(e) => { e.stopPropagation(); dismiss(toast.key); }}
            className="ml-1 opacity-70 hover:opacity-100 text-lg leading-none"
          >
            ×
          </span>
        </button>
      ))}
    </div>
  );
}
