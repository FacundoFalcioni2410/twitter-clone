"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Avatar from "@/app/components/ui/Avatar";
import { XLogo, HomeIcon, SearchIcon, ProfileIcon, BellIcon } from "@/app/components/ui/icons";
import LogoutButton from "@/app/components/layout/LogoutButton";

interface MobileNavUser {
  username: string;
  name: string;
  avatarUrl?: string | null;
}

export default function MobileNav({ user }: { user: MobileNavUser }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const links = [
    { href: "/home", label: "Home", Icon: HomeIcon },
    { href: "/search", label: "Search", Icon: SearchIcon },
    { href: "/notifications", label: "Notifications", Icon: BellIcon },
    { href: `/${user.username}`, label: "Profile", Icon: ProfileIcon },
  ];

  return (
    <>
      {/* Sticky top bar — mobile only */}
      <header className="sm:hidden sticky top-0 z-20 bg-black border-b border-zinc-800 flex items-center justify-between px-4 py-2">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-full hover:bg-white/10 transition-colors"
        >
          <Avatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
        </button>
        <XLogo className="w-6 h-6" />
        {/* Spacer to keep logo centered */}
        <div className="w-9" />
      </header>

      {/* Backdrop */}
      {open && (
        <div
          className="sm:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`sm:hidden fixed inset-y-0 left-0 z-40 w-[280px] bg-black flex flex-col p-5 transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* User info */}
        <div className="mb-6">
          <Avatar name={user.name} avatarUrl={user.avatarUrl} size="md" />
          <div className="mt-3">
            <p className="font-bold">{user.name}</p>
            <p className="text-zinc-500 text-sm">@{user.username}</p>
          </div>
          <div className="flex gap-4 mt-3 text-sm">
            <span>
              <strong>0</strong>{" "}
              <span className="text-zinc-500">Following</span>
            </span>
            <span>
              <strong>0</strong>{" "}
              <span className="text-zinc-500">Followers</span>
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-zinc-800 mb-4" />

        {/* Nav links */}
        <nav className="flex flex-col">
          {links.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-4 rounded-full px-3 py-3 hover:bg-white/10 transition-colors text-xl ${active ? "font-bold" : ""}`}
              >
                <Icon solid={active} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Logout at bottom */}
        <div className="mt-auto border-t border-zinc-800 pt-4">
          <LogoutButton />
        </div>
      </div>
    </>
  );
}
