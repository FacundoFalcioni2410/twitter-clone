"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Modal from "@/app/components/ui/Modal";
import Avatar from "@/app/components/ui/Avatar";
import FollowButton from "@/app/components/profile/FollowButton";
import { getFollowers, getFollowing } from "@/app/actions/follows";

type UserItem = {
  id: string;
  username: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  isFollowing: boolean;
  isFollowingViewer: boolean;
};

interface FollowListProps {
  userId: string;
  type: "followers" | "following";
  count: number;
  currentUserId: string;
}

export default function FollowList({ userId, type, count, currentUserId }: FollowListProps) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleOpen = () => {
    setOpen(true);
    startTransition(async () => {
      const data =
        type === "followers" ? await getFollowers(userId) : await getFollowing(userId);
      setUsers(data);
    });
  };

  const label = type === "followers" ? "Followers" : "Following";

  return (
    <>
      <button onClick={handleOpen} className="text-sm hover:underline text-left">
        <strong className="text-white">{count}</strong>{" "}
        <span className="text-zinc-500">{label}</span>
      </button>

      {open && (
        <Modal onClose={() => setOpen(false)}>
          <div className="px-4 py-3 border-b border-zinc-800 font-bold text-xl">{label}</div>

          {isPending ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-sky-500 animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-zinc-500 text-center py-10">No {label.toLowerCase()} yet.</p>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              {users.map((user) => (
                <div key={user.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
                  <Link href={`/${user.username}`} onClick={() => setOpen(false)} className="flex-shrink-0">
                    <Avatar name={user.name} avatarUrl={user.avatarUrl} size="md" />
                  </Link>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/${user.username}`} onClick={() => setOpen(false)} className="min-w-0">
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
                        <FollowButton
                          targetUserId={user.id}
                          initialIsFollowing={user.isFollowing}
                        />
                      )}
                    </div>
                    {user.bio && (
                      <p className="text-sm mt-1 text-zinc-300 line-clamp-2">{user.bio}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
