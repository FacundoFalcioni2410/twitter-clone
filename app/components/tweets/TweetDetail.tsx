"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
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
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isReplyPending, startReplyTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const remaining = MAX - replyText.length;
  const isEmpty = replyText.trim().length === 0 && !attachmentUrl;
  const isOver = remaining < 0;

  const handleImageSelect = async (file: File) => {
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("type", "reply");
    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setAttachmentUrl(json.url as string);
    } finally {
      setUploading(false);
    }
  };

  const date = new Date(tweet.createdAt).toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const handleReply = () => {
    if (isEmpty || isOver || isReplyPending || uploading) return;
    startReplyTransition(async () => {
      const result = await createReply(tweet.id, replyText, attachmentUrl);
      if (result.data) {
        window.dispatchEvent(
          new CustomEvent("reply-posted", { detail: { reply: result.data, parentId: tweet.id } })
        );
        setReplyCount((c) => c + 1);
        setReplyText("");
        setAttachmentUrl(null);
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

      {tweet.attachmentUrl && (
        <div className="mb-4 rounded-xl overflow-hidden border border-zinc-700">
          <Image src={tweet.attachmentUrl} alt="Tweet image" width={0} height={0} sizes="100vw" unoptimized className="w-full h-auto max-h-[512px] object-contain" />
        </div>
      )}

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
          {attachmentUrl && (
            <div className="relative mt-2 rounded-xl overflow-hidden border border-zinc-700">
              <Image src={attachmentUrl} alt="Reply image" width={0} height={0} sizes="100vw" unoptimized className="w-full h-auto max-h-72 object-contain" />
              <button
                onClick={() => setAttachmentUrl(null)}
                className="absolute top-2 right-2 p-1 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
                aria-label="Remove image"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                  <path d="M10.59 12L4.54 5.96l1.42-1.42L12 10.59l6.04-6.05 1.42 1.42L13.41 12l6.05 6.04-1.42 1.42L12 13.41l-6.04 6.05-1.42-1.42L10.59 12z" />
                </svg>
              </button>
            </div>
          )}
          <div className="flex items-center justify-between mt-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || !!attachmentUrl}
              aria-label="Attach image"
              className="p-2 rounded-full text-sky-500 hover:bg-sky-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <div className="w-5 h-5 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75 3.54-1.96-2.36L6.5 17h11l-3.54-4.71z" />
                </svg>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageSelect(file);
                e.target.value = "";
              }}
            />
            <div className="flex items-center gap-3">
              {replyText.length > 0 && (
                <span className={`text-sm tabular-nums ${isOver ? "text-red-500" : remaining <= 20 ? "text-yellow-500" : "text-zinc-500"}`}>
                  {remaining}
                </span>
              )}
              <button
                onClick={() => { setIsReplying(false); setReplyText(""); setAttachmentUrl(null); }}
                className="px-4 py-1 rounded-full border border-zinc-600 font-bold text-sm hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReply}
                disabled={isEmpty || isOver || isReplyPending || uploading}
                className="px-4 py-1 rounded-full bg-sky-500 font-bold text-white text-sm hover:bg-sky-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isReplyPending ? "Replying…" : "Reply"}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
