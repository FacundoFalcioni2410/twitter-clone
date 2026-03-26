"use client";

import { useState, useTransition } from "react";
import { followUser, unfollowUser } from "@/app/actions/follows";

interface FollowButtonProps {
  targetUserId: string;
  initialIsFollowing: boolean;
  className?: string;
}

export default function FollowButton({
  targetUserId,
  initialIsFollowing,
  className = "",
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [hovering, setHovering] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      if (isFollowing) {
        const result = await unfollowUser(targetUserId);
        if (!result.error) {
          setIsFollowing(false);
          window.dispatchEvent(new CustomEvent("follow-changed", { detail: { targetUserId, delta: -1 } }));
        }
      } else {
        const result = await followUser(targetUserId);
        if (!result.error) {
          setIsFollowing(true);
          window.dispatchEvent(new CustomEvent("follow-changed", { detail: { targetUserId, delta: 1 } }));
        }
      }
    });
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      disabled={isPending}
      className={`rounded-full font-bold text-sm px-4 py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        isFollowing
          ? `border ${
              hovering
                ? "border-red-500 text-red-500 bg-red-500/10"
                : "border-zinc-600 text-white"
            }`
          : "bg-white text-black hover:bg-zinc-200"
      } ${className}`}
    >
      {isFollowing ? (hovering ? "Unfollow" : "Following") : "Follow"}
    </button>
  );
}
