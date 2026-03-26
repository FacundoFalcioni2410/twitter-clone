import Link from "next/link";
import Avatar from "@/app/components/ui/Avatar";
import FollowButton from "@/app/components/profile/FollowButton";
import { getSuggestedUsers } from "@/app/actions/users";
import RightSidebarSearch from "@/app/components/layout/RightSidebarSearch";

export default async function RightSidebar({
  currentUserId,
}: {
  currentUserId: string;
}) {
  const users = await getSuggestedUsers(currentUserId);

  return (
    <aside className="hidden lg:flex flex-col w-[280px] xl:w-[350px] px-4 xl:px-6 pt-3 sticky top-0 h-screen overflow-y-auto">
      <RightSidebarSearch />

      {/* Who to follow */}
      {users.length > 0 && (
        <div className="bg-zinc-900 rounded-2xl overflow-hidden">
          <h2 className="font-extrabold text-xl px-4 pt-4 pb-1">
            Who to follow
          </h2>
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 transition-colors"
            >
              <Link
                href={`/${user.username}`}
                className="flex items-center gap-3 flex-1 min-w-0"
              >
                <Avatar
                  name={user.name}
                  avatarUrl={user.avatarUrl}
                  size="md"
                />
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate leading-tight">
                    {user.name}
                  </p>
                  <p className="text-zinc-500 text-sm truncate">
                    @{user.username}
                  </p>
                </div>
              </Link>
              <FollowButton targetUserId={user.id} initialIsFollowing={false} />
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
