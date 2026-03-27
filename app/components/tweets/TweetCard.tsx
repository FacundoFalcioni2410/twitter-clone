"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Avatar from "@/app/components/ui/Avatar";
import LikeButton from "@/app/components/tweets/LikeButton";
import { deleteTweet, createReply } from "@/app/actions/tweets";
import type { Tweet } from "@/app/lib/types";
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
    if (isEmpty || isOver || isReplyPending || uploading) return;
    startReplyTransition(async () => {
      const result = await createReply(tweet.id, replyText, attachmentUrl);
      if (result.data) {
        window.dispatchEvent(
          new CustomEvent("reply-posted", { detail: { reply: result.data, parentId: tweet.id } })
        );
        setReplyText("");
        setAttachmentUrl(null);
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

        {tweet.content && (
          <p className="mt-0.5 text-[15px] whitespace-pre-wrap break-words leading-snug">
            {tweet.content}
          </p>
        )}

        {tweet.attachmentUrl && (
          <div className="mt-2 rounded-xl overflow-hidden border border-zinc-700" onClick={(e) => e.stopPropagation()}>
            <Image src={tweet.attachmentUrl} alt="Tweet image" width={0} height={0} sizes="100vw" unoptimized className="w-full h-auto max-h-[512px] object-contain" />
          </div>
        )}

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
                  <div className="w-4 h-4 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
                ) : (
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
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
      </div>
    </article>
  );
}
