"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ComposeBox from "@/app/components/compose/ComposeBox";
import TweetCard from "@/app/components/tweets/TweetCard";
import { getTimeline } from "@/app/actions/tweets";
import type { Tweet } from "@/app/lib/types";

interface TimelineProps {
  initialTweets: Tweet[];
  initialNextCursor: string | null;
  currentUserId: string;
  user: { name: string; avatarUrl?: string | null };
}

// Survives component unmount/remount (navigation away and back).
// Stores tweets added client-side that may not yet be in the server's RSC payload.
let clientAddedTweets: Tweet[] = [];

export default function Timeline({
  initialTweets,
  initialNextCursor,
  currentUserId,
  user,
}: TimelineProps) {
  const [tweets, setTweets] = useState<Tweet[]>(() => {
    const pending = clientAddedTweets.filter(
      (t) => !initialTweets.some((s) => s.id === t.id)
    );
    return [...pending, ...initialTweets];
  });
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Once the server includes a tweet in initialTweets, remove it from the client store.
  useEffect(() => {
    clientAddedTweets = clientAddedTweets.filter(
      (t) => !initialTweets.some((s) => s.id === t.id)
    );
  }, [initialTweets]);

  const handleTweetPosted = (tweet: Tweet) => {
    clientAddedTweets = [tweet, ...clientAddedTweets.filter((t) => t.id !== tweet.id)];
    setTweets((prev) =>
      prev.some((t) => t.id === tweet.id) ? prev : [tweet, ...prev]
    );
  };

  useEffect(() => {
    const handler = (e: Event) => handleTweetPosted((e as CustomEvent<Tweet>).detail);
    window.addEventListener("tweet-posted", handler);
    return () => window.removeEventListener("tweet-posted", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // SSE: receive real-time updates dispatched by SSEProvider in the layout
  useEffect(() => {
    const onTweet = (e: Event) => handleTweetPosted((e as CustomEvent<Tweet>).detail);
    const onLike = (e: Event) => {
      const { tweetId, likeCount } = (e as CustomEvent<{ tweetId: string; likeCount: number }>).detail;
      setTweets((prev) => prev.map((t) => (t.id === tweetId ? { ...t, likeCount } : t)));
    };
    const onReplyCount = (e: Event) => {
      const { tweetId, replyCount } = (e as CustomEvent<{ tweetId: string; replyCount: number }>).detail;
      setTweets((prev) => prev.map((t) => (t.id === tweetId ? { ...t, replyCount } : t)));
    };

    window.addEventListener("sse:tweet", onTweet);
    window.addEventListener("sse:like", onLike);
    window.addEventListener("sse:replyCount", onReplyCount);
    return () => {
      window.removeEventListener("sse:tweet", onTweet);
      window.removeEventListener("sse:like", onLike);
      window.removeEventListener("sse:replyCount", onReplyCount);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const { parentId } = (e as CustomEvent<{ reply: Tweet; parentId: string }>).detail;
      setTweets((prev) =>
        prev.map((t) => (t.id === parentId ? { ...t, replyCount: t.replyCount + 1 } : t))
      );
    };
    window.addEventListener("reply-posted", handler);
    return () => window.removeEventListener("reply-posted", handler);
  }, []);

  const handleDelete = (id: string) => {
    clientAddedTweets = clientAddedTweets.filter((t) => t.id !== id);
    setTweets((prev) => prev.filter((t) => t.id !== id));
  };

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    const result = await getTimeline({ cursor: nextCursor });
    setTweets((prev) => [...prev, ...result.data]);
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

  return (
    <>
      <div className="border-b border-zinc-800">
        <ComposeBox user={user} />
      </div>

      {tweets.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          <p className="font-extrabold text-3xl mb-2">Nothing here yet</p>
          <p className="text-zinc-500">Be the first to post something!</p>
        </div>
      )}

      {tweets.map((tweet) => (
        <TweetCard
          key={tweet.id}
          tweet={tweet}
          currentUserId={currentUserId}
          onDelete={handleDelete}
        />
      ))}

      <div ref={sentinelRef} className="h-1" />

      {loading && (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-sky-500 animate-spin" />
        </div>
      )}

      {!nextCursor && tweets.length > 0 && (
        <p className="text-center text-zinc-600 text-sm py-8">You&apos;re all caught up</p>
      )}
    </>
  );
}
