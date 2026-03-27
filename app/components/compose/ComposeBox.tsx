"use client";

import { useState, useTransition, useRef } from "react";
import Image from "next/image";
import Avatar from "@/app/components/ui/Avatar";
import { createTweet } from "@/app/actions/tweets";
import type { Tweet } from "@/app/lib/types";

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
  const [attachmentUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const remaining = MAX - text.length;
  const isOver = remaining < 0;
  const isEmpty = text.trim().length === 0 && !attachmentUrl;

  const handleImageSelect = async (file: File) => {
    setUploadError(null);
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("type", "tweet");
    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setImageUrl(json.url as string);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handlePost = () => {
    if (isEmpty || isOver || isPending || uploading) return;
    startTransition(async () => {
      const result = await createTweet(text, attachmentUrl);
      if (result.data) {
        setText("");
        setImageUrl(null);
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

        {/* Image preview */}
        {attachmentUrl && (
          <div className="relative mt-2 rounded-xl overflow-hidden border border-zinc-700">
            <Image src={attachmentUrl} alt="Upload preview" width={0} height={0} sizes="100vw" className="w-full h-auto max-h-72 object-contain" />
            <button
              onClick={() => setImageUrl(null)}
              className="absolute top-2 right-2 p-1 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
              aria-label="Remove image"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M10.59 12L4.54 5.96l1.42-1.42L12 10.59l6.04-6.05 1.42 1.42L13.41 12l6.05 6.04-1.42 1.42L12 13.41l-6.04 6.05-1.42-1.42L10.59 12z" />
              </svg>
            </button>
          </div>
        )}

        {uploadError && <p className="text-red-500 text-sm mt-1">{uploadError}</p>}

        <div className="flex items-center justify-between pt-3 border-t border-zinc-800 mt-2">
          {/* Image attach button */}
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
            {text.length > 0 && (
              <span className={`text-sm tabular-nums ${isOver ? "text-red-500" : remaining <= 20 ? "text-yellow-500" : "text-zinc-500"}`}>
                {remaining}
              </span>
            )}
            <button
              onClick={handlePost}
              disabled={isEmpty || isOver || isPending || uploading}
              data-testid="compose-post-btn"
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
