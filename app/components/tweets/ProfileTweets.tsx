"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import TweetCard from "@/app/components/tweets/TweetCard";
import { getUserTweets, type Tweet } from "@/app/actions/tweets";

interface ProfileTweetsProps {
  initialTweets: Tweet[];
  initialNextCursor: string | null;
  profileUserId: string;
  currentUserId: string;
  username: string;
}

export default function ProfileTweets({
  initialTweets,
  initialNextCursor,
  profileUserId,
  currentUserId,
  username,
}: ProfileTweetsProps) {
  const [tweets, setTweets] = useState<Tweet[]>(initialTweets);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTweets(initialTweets);
    setNextCursor(initialNextCursor);
  }, [initialTweets, initialNextCursor]);

  // Prepend tweets posted by this profile's user from anywhere on the page
  useEffect(() => {
    const handler = (e: Event) => {
      const tweet = (e as CustomEvent<Tweet>).detail;
      if (tweet.author.id !== profileUserId) return;
      setTweets((prev) =>
        prev.some((t) => t.id === tweet.id) ? prev : [tweet, ...prev]
      );
    };
    window.addEventListener("tweet-posted", handler);
    return () => window.removeEventListener("tweet-posted", handler);
  }, [profileUserId]);

  const handleDelete = (id: string) => {
    setTweets((prev) => prev.filter((t) => t.id !== id));
  };

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    const result = await getUserTweets(profileUserId, { cursor: nextCursor });
    setTweets((prev) => [...prev, ...result.data]);
    setNextCursor(result.nextCursor);

    loadingRef.current = false;
    setLoading(false);
  }, [nextCursor, profileUserId]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !nextCursor) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loadMore();
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, nextCursor]);

  if (tweets.length === 0 && !loading) {
    return (
      <div className="px-8 py-16 text-center">
        <h3 className="font-extrabold text-3xl mb-2">
          {currentUserId === profileUserId
            ? "You haven't posted yet"
            : `@${username} hasn't posted yet`}
        </h3>
        <p className="text-zinc-500">When they post, their posts will show up here.</p>
      </div>
    );
  }

  return (
    <>
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
        <p className="text-center text-zinc-600 text-sm py-8">No more posts</p>
      )}
    </>
  );
}
