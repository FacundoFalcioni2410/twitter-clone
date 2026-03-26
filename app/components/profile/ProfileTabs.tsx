"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function ProfileTabs({ username }: { username: string }) {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "posts";

  const tabClass = (name: string) =>
    `flex-1 flex justify-center py-4 hover:bg-white/5 transition-colors text-sm font-medium ${
      tab === name
        ? "font-bold border-b-2 border-sky-500 text-white"
        : "text-zinc-500"
    }`;

  return (
    <div className="flex mt-4 border-b border-zinc-800">
      <Link href={`/${username}`} className={tabClass("posts")}>
        Posts
      </Link>
      <Link href={`/${username}?tab=likes`} className={tabClass("likes")}>
        Likes
      </Link>
    </div>
  );
}
