"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import Avatar from "@/app/components/ui/Avatar";
import { deleteTweet, type Tweet } from "@/app/actions/tweets";
import { formatTime } from "@/app/lib/utils";

interface TweetCardProps {
  tweet: Tweet;
  currentUserId: string;
  onDelete: (id: string) => void;
}

export default function TweetCard({ tweet, currentUserId, onDelete }: TweetCardProps) {
  const isOwn = tweet.author.id === currentUserId;
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleDelete = () => {
    setMenuOpen(false);
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
            <span className="text-zinc-500 shrink-0">{formatTime(tweet.createdAt)}</span>
          </div>

          {isOwn && (
            <div className="relative shrink-0" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="More options"
                className="p-1.5 -mt-1 rounded-full text-zinc-500 hover:text-sky-500 hover:bg-sky-500/10 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                  <path d="M3 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm9 2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm7 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-black border border-zinc-800 rounded-xl shadow-xl z-20 overflow-hidden">
                  <button
                    onClick={handleDelete}
                    className="w-full text-left px-4 py-3 text-red-500 hover:bg-white/5 transition-colors font-bold text-sm"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="mt-0.5 text-[15px] whitespace-pre-wrap break-words leading-snug">
          {tweet.content}
        </p>
      </div>
    </article>
  );
}
