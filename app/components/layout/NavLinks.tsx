"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, SearchIcon, ProfileIcon } from "@/app/components/ui/icons";

interface NavLinksProps {
  username: string;
}

export default function NavLinks({ username }: NavLinksProps) {
  const pathname = usePathname();

  const links = [
    { href: "/home", label: "Home", Icon: HomeIcon },
    { href: "/search", label: "Search", Icon: SearchIcon },
    { href: `/${username}`, label: "Profile", Icon: ProfileIcon },
  ];

  return (
    <nav className="flex flex-col mt-1">
      {links.map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center justify-center xl:justify-start gap-4 rounded-full p-3 transition-colors hover:bg-white/10 w-full xl:w-fit ${active ? "font-bold" : ""}`}
          >
            <Icon solid={active} />
            <span className="hidden xl:inline text-xl pr-4">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
