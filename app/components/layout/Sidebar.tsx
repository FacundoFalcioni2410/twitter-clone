import Link from "next/link";
import Avatar from "@/app/components/ui/Avatar";
import { XLogo } from "@/app/components/ui/icons";
import NavLinks from "@/app/components/layout/NavLinks";
import LogoutButton from "@/app/components/layout/LogoutButton";
import PostButton from "@/app/components/compose/PostButton";

interface SidebarUser {
  username: string;
  name: string;
  avatarUrl?: string | null;
}

export default function Sidebar({ user, initialUnreadCount }: { user: SidebarUser; initialUnreadCount: number }) {
  return (
    <aside className="hidden sm:flex flex-col items-center xl:items-stretch fixed left-0 top-0 h-screen w-[68px] xl:w-[275px] px-2 xl:px-3 py-2 border-r border-zinc-800 overflow-y-auto">
      {/* X Logo */}
      <Link
        href="/home"
        className="flex items-center justify-center h-[52px] w-[52px] xl:w-full xl:justify-start xl:px-3 rounded-full hover:bg-white/10 transition-colors mb-1"
      >
        <XLogo />
      </Link>

      {/* Navigation */}
      <NavLinks username={user.username} initialUnreadCount={initialUnreadCount} />

      {/* Post button */}
      <div className="mt-4 w-full xl:w-auto">
        <PostButton user={user} />
      </div>

      {/* User + Logout */}
      <div className="mt-auto pt-4 w-full xl:w-auto">
        {/* Narrow: avatar on top, logout below */}
        <div className="flex xl:hidden flex-col items-center gap-1 pb-2">
          <Link href={`/${user.username}`} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <Avatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
          </Link>
          <LogoutButton compact />
        </div>
        {/* Wide: single row */}
        <div className="hidden xl:flex items-center gap-3 px-3 py-3 rounded-full hover:bg-white/10 transition-colors overflow-hidden">
          <Link href={`/${user.username}`} className="flex items-center gap-3 min-w-0 flex-1">
            <Avatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm truncate">{user.name}</span>
              <span className="text-zinc-500 text-sm truncate">@{user.username}</span>
            </div>
          </Link>
          <LogoutButton compact />
        </div>
      </div>
    </aside>
  );
}
