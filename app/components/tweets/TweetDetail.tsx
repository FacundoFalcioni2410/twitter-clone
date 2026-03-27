"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Avatar from "@/app/components/ui/Avatar";
import LikeButton from "@/app/components/tweets/LikeButton";
import { createReply } from "@/app/actions/tweets";
import type { Tweet } from "@/app/lib/types";

const MAX = 280;

interface TweetDetailProps {
  tweet: Tweet;
  currentUserId: string;
}

export default function TweetDetail({ tweet, currentUserId }: TweetDetailProps) {
  const [replyCount, setReplyCount] = useState(tweet.replyCount);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isReplyPending, startReplyTransition] = useTransition();

  const remaining = MAX - replyText.length;
  const isEmpty = replyText.trim().length === 0;
  const isOver = remaining < 0;

  const date = new Date(tweet.createdAt).toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const handleReply = () => {
    if (isEmpty || isOver || isReplyPending) return;
    startReplyTransition(async () => {
      const result = await createReply(tweet.id, replyText);
      if (result.data) {
        window.dispatchEvent(
          new CustomEvent("reply-posted", { detail: { reply: result.data, parentId: tweet.id } })
        );
        setReplyCount((c) => c + 1);
        setReplyText("");
        setIsReplying(false);
      }
    });
  };

  if (tweet.deleted) {
    return (
      <article className="px-4 pt-4 pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-3 mb-3">
          <Link href={`/${tweet.author.username}`}>
            <Avatar name={tweet.author.name} avatarUrl={tweet.author.avatarUrl} size="md" />
          </Link>
          <div>
            <Link href={`/${tweet.author.username}`} className="font-bold hover:underline block leading-tight">
              {tweet.author.name}
            </Link>
            <p className="text-zinc-500 text-sm">@{tweet.author.username}</p>
          </div>
        </div>
        <div className="border border-zinc-700 rounded-xl px-4 py-5 mb-4">
          <p className="text-zinc-500 text-[15px]">This post is unavailable.</p>
        </div>
      </article>
    );
  }

  return (
    <article className="px-4 pt-4 pb-3 border-b border-zinc-800">
      <div className="flex items-center gap-3 mb-3">
        <Link href={`/${tweet.author.username}`}>
          <Avatar name={tweet.author.name} avatarUrl={tweet.author.avatarUrl} size="md" />
        </Link>
        <div>
          <Link href={`/${tweet.author.username}`} className="font-bold hover:underline block leading-tight">
            {tweet.author.name}
          </Link>
          <p className="text-zinc-500 text-sm">@{tweet.author.username}</p>
        </div>
      </div>

      <p className="text-2xl whitespace-pre-wrap break-words leading-snug mb-4">
        {tweet.content}
      </p>

      <p className="text-zinc-500 text-sm border-b border-zinc-800 pb-3 mb-3" suppressHydrationWarning>
        {date}
      </p>

      {(tweet.likeCount > 0 || replyCount > 0) && (
        <div className="flex items-center gap-4 text-[15px] border-b border-zinc-800 pb-3 mb-3">
          {replyCount > 0 && (
            <span>
              <strong>{replyCount}</strong>{" "}
              <span className="text-zinc-500">{replyCount === 1 ? "Reply" : "Replies"}</span>
            </span>
          )}
          {tweet.likeCount > 0 && (
            <span>
              <strong>{tweet.likeCount}</strong>{" "}
              <span className="text-zinc-500">{tweet.likeCount === 1 ? "Like" : "Likes"}</span>
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsReplying((v) => !v)}
          aria-label="Reply"
          className={`flex items-center gap-1 p-2 rounded-full transition-colors ${
            isReplying
              ? "text-sky-500 bg-sky-500/10"
              : "text-zinc-500 hover:text-sky-500 hover:bg-sky-500/10"
          }`}
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <LikeButton
          tweetId={tweet.id}
          initialIsLiked={tweet.isLiked}
          initialCount={tweet.likeCount}
        />
      </div>

      {isReplying && (
        <div className="mt-3 pt-3 border-t border-zinc-800">
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
    </article>
  );
}
