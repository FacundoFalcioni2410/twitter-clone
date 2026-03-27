"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Avatar from "@/app/components/ui/Avatar";
import LikeButton from "@/app/components/tweets/LikeButton";
import { deleteTweet, createReply, type Tweet } from "@/app/actions/tweets";
import { formatTime } from "@/app/lib/utils";

const MAX = 280;

interface TweetCardProps {
  tweet: Tweet;
  currentUserId: string;
  onDelete?: (id: string) => void;
  hasConnector?: boolean;
}

function UnavailablePlaceholder({ tweet, hasConnector }: { tweet: Tweet; hasConnector?: boolean }) {
  return (
    <article className="relative flex gap-3 px-4 py-3 border-b border-zinc-800">
      <div className="relative shrink-0 mt-0.5">
        <Avatar name={tweet.author.name} avatarUrl={tweet.author.avatarUrl} size="md" />
        {hasConnector && (
          <div className="absolute left-1/2 -translate-x-1/2 top-[40px] bottom-0 w-0.5 bg-zinc-700" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-1 min-w-0 text-[15px] mb-2">
          <span className="font-bold truncate max-w-[120px] sm:max-w-none">{tweet.author.name}</span>
          <span className="text-zinc-500 truncate">@{tweet.author.username}</span>
          <span className="text-zinc-500">·</span>
          <span className="text-zinc-500 shrink-0" suppressHydrationWarning>{formatTime(tweet.createdAt)}</span>
        </div>
        <div className="border border-zinc-700 rounded-xl px-4 py-3">
          <p className="text-zinc-500 text-[15px]">This post is unavailable.</p>
        </div>
      </div>
    </article>
  );
}

export default function TweetCard({ tweet, currentUserId, onDelete, hasConnector }: TweetCardProps) {
  const router = useRouter();
  const isOwn = tweet.author.id === currentUserId;
  const [isPending, startTransition] = useTransition();
  const [deletedLocally, setDeletedLocally] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isReplyPending, startReplyTransition] = useTransition();

  const remaining = MAX - replyText.length;
  const isEmpty = replyText.trim().length === 0;
  const isOver = remaining < 0;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    startTransition(async () => {
      const result = await deleteTweet(tweet.id);
      if (!result.error) {
        setDeletedLocally(true);
        onDelete?.(tweet.id);
      }
    });
  };

  const handleReply = () => {
    if (isEmpty || isOver || isReplyPending) return;
    startReplyTransition(async () => {
      const result = await createReply(tweet.id, replyText);
      if (result.data) {
        window.dispatchEvent(
          new CustomEvent("reply-posted", { detail: { reply: result.data, parentId: tweet.id } })
        );
        setReplyText("");
        setIsReplying(false);
      }
    });
  };

  if (tweet.deleted || deletedLocally) {
    return <UnavailablePlaceholder tweet={tweet} hasConnector={hasConnector} />;
  }

  return (
    <article
      onClick={() => router.push(`/${tweet.author.username}/status/${tweet.id}`)}
      className={`flex gap-3 px-4 py-3 border-b border-zinc-800 hover:bg-white/[0.03] transition-colors cursor-pointer${isPending ? " opacity-50 pointer-events-none" : ""}`}
    >
      <div className="relative shrink-0 mt-0.5">
        <Link href={`/${tweet.author.username}`} onClick={(e) => e.stopPropagation()}>
          <Avatar name={tweet.author.name} avatarUrl={tweet.author.avatarUrl} size="md" />
        </Link>
        {hasConnector && (
          <div className="absolute left-1/2 -translate-x-1/2 top-[40px] bottom-0 w-0.5 bg-zinc-700" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <div className="flex flex-wrap items-center gap-x-1 min-w-0 text-[15px]">
            <Link
              href={`/${tweet.author.username}`}
              onClick={(e) => e.stopPropagation()}
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

        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={(e) => { e.stopPropagation(); setIsReplying((v) => !v); }}
            aria-label="Reply"
            className={`flex items-center gap-1 p-1.5 rounded-full transition-colors ${
              isReplying
                ? "text-sky-500 bg-sky-500/10"
                : "text-zinc-500 hover:text-sky-500 hover:bg-sky-500/10"
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {tweet.replyCount > 0 && <span className="text-sm tabular-nums">{tweet.replyCount}</span>}
          </button>
          <LikeButton
            tweetId={tweet.id}
            initialIsLiked={tweet.isLiked}
            initialCount={tweet.likeCount}
          />
        </div>

        {isReplying && (
          <div className="mt-3 pt-3 border-t border-zinc-800" onClick={(e) => e.stopPropagation()}>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleReply();
              }}
              placeholder="Post your reply"
              autoFocus
              rows={2}
              className="w-full bg-transparent text-[15px] placeholder-zinc-500 resize-none focus:outline-none"
            />
            <div className="flex items-center justify-end gap-3 mt-1">
              {replyText.length > 0 && (
                <span className={`text-sm tabular-nums ${isOver ? "text-red-500" : remaining <= 20 ? "text-yellow-500" : "text-zinc-500"}`}>
                  {remaining}
                </span>
              )}
              <button
                onClick={() => { setIsReplying(false); setReplyText(""); }}
                className="px-4 py-1 rounded-full border border-zinc-600 font-bold text-sm hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReply}
                disabled={isEmpty || isOver || isReplyPending}
                className="px-4 py-1 rounded-full bg-sky-500 font-bold text-white text-sm hover:bg-sky-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isReplyPending ? "Replying…" : "Reply"}
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
