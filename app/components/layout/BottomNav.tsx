"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, SearchIcon, ProfileIcon } from "@/app/components/ui/icons";

export default function BottomNav({ username }: { username: string }) {
  const pathname = usePathname();

  const links = [
    { href: "/home", label: "Home", Icon: HomeIcon },
    { href: "/search", label: "Search", Icon: SearchIcon },
    { href: `/${username}`, label: "Profile", Icon: ProfileIcon },
  ];

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-20 flex border-t border-zinc-800 bg-black">
      {links.map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className="flex flex-1 items-center justify-center py-3 transition-colors hover:bg-white/5"
          >
            <Icon solid={active} />
          </Link>
        );
      })}
    </nav>
  );
}
