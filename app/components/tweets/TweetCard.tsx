"use client";

import { useTransition } from "react";
import Link from "next/link";
import Avatar from "@/app/components/ui/Avatar";
import LikeButton from "@/app/components/tweets/LikeButton";
import { deleteTweet, type Tweet } from "@/app/actions/tweets";
import { formatTime } from "@/app/lib/utils";

interface TweetCardProps {
  tweet: Tweet;
  currentUserId: string;
  onDelete: (id: string) => void;
}

export default function TweetCard({ tweet, currentUserId, onDelete }: TweetCardProps) {
  const isOwn = tweet.author.id === currentUserId;
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteTweet(tweet.id);
      if (!result.error) onDelete(tweet.id);
    });
  };

  return (
    <article
      className={`flex gap-3 px-4 py-3 border-b border-zinc-800 hover:bg-white/[0.03] transition-colors${isPending ? " opacity-50 pointer-events-none" : ""}`}
    >
      <Link href={`/${tweet.author.username}`} className="shrink-0 mt-0.5">
        <Avatar name={tweet.author.name} avatarUrl={tweet.author.avatarUrl} size="md" />
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <div className="flex flex-wrap items-center gap-x-1 min-w-0 text-[15px]">
            <Link
              href={`/${tweet.author.username}`}
              className="font-bold hover:underline truncate max-w-[120px] sm:max-w-none"
            >
              {tweet.author.name}
            </Link>
            <span className="text-zinc-500 truncate">@{tweet.author.username}</span>
            <span className="text-zinc-500">·</span>
            <span className="text-zinc-500 shrink-0" suppressHydrationWarning>{formatTime(tweet.createdAt)}</span>
          </div>

          {isOwn && (
            <button
              onClick={handleDelete}
              aria-label="Delete tweet"
              className="p-1.5 -mt-1 shrink-0 rounded-full text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M16 6V4.5C16 3.12 14.88 2 13.5 2h-3C9.12 2 8 3.12 8 4.5V6H3v2h1.06l.81 11.21C4.98 20.78 6.28 22 7.86 22h8.28c1.58 0 2.88-1.22 2.99-2.79L19.94 8H21V6h-5zm-6-1.5c0-.28.22-.5.5-.5h3c.28 0 .5.22.5.5V6h-4V4.5zm7.13 15.03c-.04.54-.49.97-1.03.97H7.86c-.54 0-.99-.43-1.03-.97L6.07 8h11.86l-.8 11.53z" />
              </svg>
            </button>
          )}
        </div>

        <p className="mt-0.5 text-[15px] whitespace-pre-wrap break-words leading-snug">
          {tweet.content}
        </p>

        <div className="flex items-center mt-2">
          <LikeButton
            tweetId={tweet.id}
            initialIsLiked={tweet.isLiked}
            initialCount={tweet.likeCount}
          />
        </div>
      </div>
    </article>
  );
}
