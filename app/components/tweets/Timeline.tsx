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
    setTweets((prev) => [tweet, ...prev]);
  };

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
        <ComposeBox user={user} onTweetPosted={handleTweetPosted} />
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
