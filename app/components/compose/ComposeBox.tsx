"use client";

import { useState } from "react";
import Avatar from "@/app/components/ui/Avatar";

const MAX = 280;

interface ComposeBoxProps {
  user: { name: string; avatarUrl?: string | null };
  autoFocus?: boolean;
}

export default function ComposeBox({ user, autoFocus = false }: ComposeBoxProps) {
  const [text, setText] = useState("");
  const remaining = MAX - text.length;
  const isOver = remaining < 0;
  const isEmpty = text.trim().length === 0;

  return (
    <div className="flex gap-3 px-4 pt-4 pb-2">
      <Avatar name={user.name} avatarUrl={user.avatarUrl} size="md" />
      <div className="flex-1 min-w-0">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
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
              disabled={isEmpty || isOver}
              className="px-5 py-1.5 rounded-full bg-sky-500 font-bold text-white text-sm
                         hover:bg-sky-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MediaBtn({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="p-2 rounded-full hover:bg-sky-500/10 transition-colors"
    >
      {children}
    </button>
  );
}
