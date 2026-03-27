"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ComposeBox from "@/app/components/compose/ComposeBox";
import TweetCard from "@/app/components/tweets/TweetCard";
import { getTimeline, type Tweet } from "@/app/actions/tweets";

interface TimelineProps {
  initialTweets: Tweet[];
  initialNextCursor: string | null;
  currentUserId: string;
  user: { name: string; avatarUrl?: string | null };
}

export default function Timeline({
  initialTweets,
  initialNextCursor,
  currentUserId,
  user,
}: TimelineProps) {
  const [tweets, setTweets] = useState<Tweet[]>(initialTweets);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleTweetPosted = (tweet: Tweet) => {
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

  // SSE: receive real-time updates from the server
  useEffect(() => {
    if (!currentUserId) return;
    const es = new EventSource("/api/timeline/stream");

    // New tweet from a followed user — deduplicates against tweet-posted
    es.addEventListener("tweet", (e) => {
      const tweet = JSON.parse(e.data) as Tweet;
      handleTweetPosted(tweet);
    });

    // Like count changed on any tweet currently in the list
    es.addEventListener("like", (e) => {
      const { tweetId, likeCount } = JSON.parse(e.data) as { tweetId: string; likeCount: number };
      setTweets((prev) =>
        prev.map((t) => (t.id === tweetId ? { ...t, likeCount } : t))
      );
    });

    // Reply count changed on any tweet currently in the list
    es.addEventListener("replyCount", (e) => {
      const { tweetId, replyCount } = JSON.parse(e.data) as { tweetId: string; replyCount: number };
      setTweets((prev) =>
        prev.map((t) => (t.id === tweetId ? { ...t, replyCount } : t))
      );
    });

    return () => es.close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

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
