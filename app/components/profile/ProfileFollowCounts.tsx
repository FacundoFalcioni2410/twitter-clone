"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ProfileFollowCountsProps {
  username: string;
  profileUserId: string;
  initialFollowingCount: number;
  initialFollowersCount: number;
}

export default function ProfileFollowCounts({
  username,
  profileUserId,
  initialFollowingCount,
  initialFollowersCount,
}: ProfileFollowCountsProps) {
  const [followersCount, setFollowersCount] = useState(initialFollowersCount);

  useEffect(() => {
    const handler = (e: Event) => {
      const { targetUserId, delta } = (e as CustomEvent).detail;
      if (targetUserId === profileUserId) {
        setFollowersCount((prev) => Math.max(0, prev + delta));
      }
    };
    window.addEventListener("follow-changed", handler);
    return () => window.removeEventListener("follow-changed", handler);
  }, [profileUserId]);

  return (
    <div className="flex gap-5 mt-3 text-sm">
      <Link href={`/${username}/following`} className="hover:underline text-left">
        <strong className="text-white">{initialFollowingCount}</strong>{" "}
        <span className="text-zinc-500">Following</span>
      </Link>
      <Link href={`/${username}/followers`} className="hover:underline text-left">
        <strong className="text-white">{followersCount}</strong>{" "}
        <span className="text-zinc-500">Followers</span>
      </Link>
    </div>
  );
}
