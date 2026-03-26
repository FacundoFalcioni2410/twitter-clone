"use client";

import { useState, useTransition } from "react";
import Avatar from "@/app/components/ui/Avatar";
import { createTweet, type Tweet } from "@/app/actions/tweets";

const MAX = 280;

interface ComposeBoxProps {
  user: { name: string; avatarUrl?: string | null };
  autoFocus?: boolean;
  onTweetPosted?: (tweet: Tweet) => void;
  onClose?: () => void;
}

export default function ComposeBox({
  user,
  autoFocus = false,
  onTweetPosted,
  onClose,
}: ComposeBoxProps) {
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const remaining = MAX - text.length;
  const isOver = remaining < 0;
  const isEmpty = text.trim().length === 0;

  const handlePost = () => {
    if (isEmpty || isOver || isPending) return;
    startTransition(async () => {
      const result = await createTweet(text);
      if (result.data) {
        setText("");
        window.dispatchEvent(new CustomEvent("tweet-posted", { detail: result.data }));
        onTweetPosted?.(result.data);
        onClose?.();
      }
    });
  };

  return (
    <div className="flex gap-3 px-4 pt-4 pb-2">
      <Avatar name={user.name} avatarUrl={user.avatarUrl} size="md" />
      <div className="flex-1 min-w-0">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handlePost();
          }}
          placeholder="What's happening?"
          autoFocus={autoFocus}
          rows={3}
          className="w-full bg-transparent text-xl placeholder-zinc-500 resize-none focus:outline-none mt-2"
        />
        <div className="flex items-center justify-end pt-3 border-t border-zinc-800 mt-1">
          <div className="flex items-center gap-3">
            {text.length > 0 && (
              <span
                className={`text-sm tabular-nums ${
                  isOver
                    ? "text-red-500"
                    : remaining <= 20
                    ? "text-yellow-500"
                    : "text-zinc-500"
                }`}
              >
                {remaining}
              </span>
            )}
            <button
              onClick={handlePost}
              disabled={isEmpty || isOver || isPending}
              className="px-5 py-1.5 rounded-full bg-sky-500 font-bold text-white text-sm
                         hover:bg-sky-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "Posting…" : "Post"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
