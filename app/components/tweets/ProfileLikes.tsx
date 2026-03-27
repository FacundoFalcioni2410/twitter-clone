"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import TweetCard from "@/app/components/tweets/TweetCard";
import { getLikedTweets } from "@/app/actions/tweets";
import type { Tweet } from "@/app/lib/types";

interface ProfileLikesProps {
  initialTweets: Tweet[];
  initialNextCursor: string | null;
  profileUserId: string;
  currentUserId: string;
  username: string;
}

export default function ProfileLikes({
  initialTweets,
  initialNextCursor,
  profileUserId,
  currentUserId,
  username,
}: ProfileLikesProps) {
  const [tweets, setTweets] = useState<Tweet[]>(initialTweets);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleDelete = (id: string) => {
    setTweets((prev) => prev.filter((t) => t.id !== id));
  };

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    const result = await getLikedTweets(profileUserId, { cursor: nextCursor });
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
            ? "You haven't liked any posts yet"
            : `@${username} hasn't liked any posts yet`}
        </h3>
        <p className="text-zinc-500">When they like posts, they'll show up here.</p>
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
