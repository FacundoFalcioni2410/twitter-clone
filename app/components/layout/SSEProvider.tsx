"use client";

import { useEffect } from "react";
import type { NotificationPayload, Tweet } from "@/app/lib/types";

// Dispatches window events for every SSE message so any component can listen
// regardless of which page is currently rendered.
export default function SSEProvider({ userId }: { userId: string }) {
  useEffect(() => {
    if (!userId) return;
    const es = new EventSource("/api/timeline/stream");

    es.addEventListener("tweet", (e) => {
      window.dispatchEvent(new CustomEvent<Tweet>("sse:tweet", { detail: JSON.parse(e.data) }));
    });

    es.addEventListener("like", (e) => {
      window.dispatchEvent(new CustomEvent<{ tweetId: string; likeCount: number }>("sse:like", { detail: JSON.parse(e.data) }));
    });

    es.addEventListener("replyCount", (e) => {
      window.dispatchEvent(new CustomEvent<{ tweetId: string; replyCount: number }>("sse:replyCount", { detail: JSON.parse(e.data) }));
    });

    es.addEventListener("notification", (e) => {
      window.dispatchEvent(new CustomEvent<NotificationPayload>("sse:notification", { detail: JSON.parse(e.data) }));
    });

    return () => es.close();
  }, [userId]);

  return null;
}
