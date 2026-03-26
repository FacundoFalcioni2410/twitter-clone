import Link from "next/link";
import Avatar from "@/app/components/ui/Avatar";
import { getSuggestedUsers } from "@/app/actions/users";

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export default async function RightSidebar({
  currentUserId,
}: {
  currentUserId: string;
}) {
  const users = await getSuggestedUsers(currentUserId);

  return (
    <aside className="hidden lg:flex flex-col w-[280px] xl:w-[350px] px-4 xl:px-6 pt-3 sticky top-0 h-screen overflow-y-auto">
      {/* Search bar — links to search page (functional in Feature 4) */}
      <Link
        href="/search"
        className="flex items-center gap-3 bg-zinc-900 rounded-full px-4 py-3 mb-4 hover:bg-zinc-800 transition-colors"
      >
        <span className="text-zinc-500">
          <SearchIcon />
        </span>
        <span className="text-zinc-500 text-[15px]">Search</span>
      </Link>

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
              <button
                type="button"
                className="px-4 py-1.5 rounded-full bg-white text-black font-bold text-sm hover:bg-zinc-200 transition-colors flex-shrink-0"
              >
                Follow
              </button>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
