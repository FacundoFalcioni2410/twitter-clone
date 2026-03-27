"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { likeTweet, unlikeTweet, getTweetLikes } from "@/app/actions/likes";
import Modal from "@/app/components/ui/Modal";
import Avatar from "@/app/components/ui/Avatar";

type Liker = { id: string; username: string; name: string; avatarUrl: string | null; bio: string | null };

interface LikeButtonProps {
  tweetId: string;
  initialIsLiked: boolean;
  initialCount: number;
}

export default function LikeButton({ tweetId, initialIsLiked, initialCount }: LikeButtonProps) {
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();
  const [showLikers, setShowLikers] = useState(false);
  const [likers, setLikers] = useState<Liker[]>([]);
  const [loadingLikers, startLikersTransition] = useTransition();

  const handleLike = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    startTransition(async () => {
      if (isLiked) {
        const result = await unlikeTweet(tweetId);
        if (!result.error) {
          setIsLiked(false);
          setCount((c) => c - 1);
        }
      } else {
        const result = await likeTweet(tweetId);
        if (!result.error) {
          setIsLiked(true);
          setCount((c) => c + 1);
        }
      }
    });
  };

  const handleShowLikers = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowLikers(true);
    startLikersTransition(async () => {
      const data = await getTweetLikes(tweetId);
      setLikers(data);
    });
  };

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          onClick={handleLike}
          disabled={isPending}
          aria-label={isLiked ? "Unlike" : "Like"}
          className={`p-1.5 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isLiked
              ? "text-pink-500 bg-pink-500/10"
              : "text-zinc-500 hover:text-pink-500 hover:bg-pink-500/10"
          }`}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {count > 0 && (
          <button
            onClick={handleShowLikers}
            className="text-sm tabular-nums text-zinc-500 hover:underline"
          >
            {count}
          </button>
        )}
      </div>

      {showLikers && (
        <Modal onClose={() => setShowLikers(false)}>
          <div className="px-4 py-3 border-b border-zinc-800 font-bold text-xl">Liked by</div>

          {loadingLikers ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-sky-500 animate-spin" />
            </div>
          ) : likers.length === 0 ? (
            <p className="text-zinc-500 text-center py-10">No likes yet.</p>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              {likers.map((user) => (
                <Link
                  key={user.id}
                  href={`/${user.username}`}
                  onClick={() => setShowLikers(false)}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-zinc-800/50"
                >
                  <Avatar name={user.name} avatarUrl={user.avatarUrl} size="md" />
                  <div className="min-w-0">
                    <p className="font-bold text-[15px] truncate">{user.name}</p>
                    <p className="text-zinc-500 text-sm">@{user.username}</p>
                    {user.bio && <p className="text-sm mt-1 text-zinc-300 line-clamp-2">{user.bio}</p>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
