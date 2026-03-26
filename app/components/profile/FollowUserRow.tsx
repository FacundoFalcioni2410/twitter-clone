"use client";

import Link from "next/link";
import Avatar from "@/app/components/ui/Avatar";
import FollowButton from "@/app/components/profile/FollowButton";

type FollowUser = {
  id: string;
  username: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  isFollowing: boolean;
  isFollowingViewer: boolean;
};

interface FollowUserRowProps {
  user: FollowUser;
  currentUserId: string;
}

export default function FollowUserRow({ user, currentUserId }: FollowUserRowProps) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-zinc-800/50">
      <Link href={`/${user.username}`} className="flex-shrink-0">
        <Avatar name={user.name} avatarUrl={user.avatarUrl} size="md" />
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/${user.username}`} className="min-w-0">
            <p className="font-bold text-[15px] truncate leading-tight">{user.name}</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-zinc-500 text-sm">@{user.username}</span>
              {user.isFollowingViewer && (
                <span className="text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-medium">
                  Follows you
                </span>
              )}
            </div>
          </Link>
          {user.id !== currentUserId && (
            <FollowButton targetUserId={user.id} initialIsFollowing={user.isFollowing} />
          )}
        </div>
        {user.bio && (
          <p className="text-sm mt-1 text-zinc-300 line-clamp-2">{user.bio}</p>
        )}
      </div>
    </div>
  );
}
