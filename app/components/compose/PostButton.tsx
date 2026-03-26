"use client";

import { useState } from "react";
import ComposeModal from "@/app/components/compose/ComposeModal";

interface PostButtonProps {
  user: { name: string; avatarUrl?: string | null };
}

export default function PostButton({ user }: PostButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-full bg-sky-500 py-3 font-bold text-white hover:bg-sky-400 transition-colors flex items-center justify-center"
      >
        <span className="hidden xl:inline">Post</span>
        {/* Pencil icon for icon-only mode */}
        <svg viewBox="0 0 24 24" className="w-5 h-5 xl:hidden" fill="currentColor">
          <path d="M23.077 4.573l-.001-.001c-.487-.487-1.15-.754-1.836-.753-.686.001-1.349.27-1.835.757L5.19 18.794l-.003.003c-.096.097-.168.214-.212.34L3.02 23.29c-.085.234-.028.494.148.67.128.128.3.199.479.2.064 0 .13-.009.193-.029l4.154-1.957.003-.001c.125-.044.24-.116.336-.212L22.556 7.943c1.014-1.014 1.013-2.659-.001-3.673l.522-.522-.001.825zM7.533 20.522l-2.947 1.389 1.39-2.947 11.645-11.644 1.558 1.558L7.533 20.522zm13.6-14.003l-1.203 1.203-1.558-1.558 1.203-1.202c.245-.246.577-.383.922-.383.344 0 .676.136.922.382.509.51.508 1.35-.001 1.858l-.285-.3z" />
        </svg>
      </button>

      {open && <ComposeModal user={user} onClose={() => setOpen(false)} />}
    </>
  );
}
