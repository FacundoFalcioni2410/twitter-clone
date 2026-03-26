import Link from "next/link";
import Avatar from "@/app/components/ui/Avatar";
import { XLogo } from "@/app/components/ui/icons";
import NavLinks from "@/app/components/layout/NavLinks";
import LogoutButton from "@/app/components/layout/LogoutButton";

interface SidebarUser {
  username: string;
  name: string;
  avatarUrl?: string | null;
}

export default function Sidebar({ user }: { user: SidebarUser }) {
  return (
    <aside className="hidden sm:flex flex-col fixed left-0 top-0 h-screen w-[68px] xl:w-[275px] px-2 xl:px-3 py-2 border-r border-zinc-800 overflow-y-auto">
      {/* X Logo */}
      <Link
        href="/home"
        className="flex items-center justify-center xl:justify-start xl:px-3 mb-1 h-[52px] w-fit rounded-full hover:bg-white/10 transition-colors"
      >
        <XLogo />
      </Link>

      {/* Navigation */}
      <NavLinks username={user.username} />

      {/* Post button */}
      <div className="mt-4">
        <button
          disabled
          title="Coming soon"
          className="w-full rounded-full bg-sky-500 py-3 font-bold text-white hover:bg-sky-400 transition-colors disabled:opacity-60 flex items-center justify-center"
        >
          <span className="hidden xl:inline">Post</span>
          <svg viewBox="0 0 24 24" className="w-5 h-5 xl:hidden" fill="currentColor">
            <path d="M23 3c-6.62-.1-10.38 2.421-13.05 6.03C7.29 12.61 6 17.331 6 22h2c0-1.007.07-2.012.19-3H12c4.1 0 7.48-2.91 7.98-6.943.5-4.032-2.79-7.52-6.93-7.057.85-1.14 2.34-2.368 4.95-2.943z" />
          </svg>
        </button>
      </div>

      {/* User + Logout */}
      <div className="mt-auto pt-4">
        <div className="flex items-center gap-3 px-3 py-3 rounded-full hover:bg-white/10 transition-colors overflow-hidden">
          <Avatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
          <div className="hidden xl:flex flex-col min-w-0 flex-1">
            <span className="font-bold text-sm truncate">{user.name}</span>
            <span className="text-zinc-500 text-sm truncate">@{user.username}</span>
          </div>
          <div className="hidden xl:block ml-auto">
            <LogoutButton compact />
          </div>
        </div>
      </div>
    </aside>
  );
}
