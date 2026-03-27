"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, SearchIcon, BellIcon } from "@/app/components/ui/icons";
import type { NotificationPayload } from "@/app/lib/sse";

interface NavLinksProps {
  username: string;
  initialUnreadCount: number;
}

export default function NavLinks({ username, initialUnreadCount }: NavLinksProps) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  // Clear badge when visiting the notifications page
  useEffect(() => {
    if (pathname === "/notifications") setUnreadCount(0);
  }, [pathname]);

  // Increment badge on incoming SSE notifications
  useEffect(() => {
    const handler = (e: Event) => {
      const notif = (e as CustomEvent<NotificationPayload>).detail;
      if (!notif.read) setUnreadCount((n) => n + 1);
    };
    window.addEventListener("sse:notification", handler);
    return () => window.removeEventListener("sse:notification", handler);
  }, []);

  const links = [
    { href: "/home", label: "Home", Icon: HomeIcon },
    { href: "/search", label: "Search", Icon: SearchIcon },
    { href: "/notifications", label: "Notifications", Icon: BellIcon, badge: unreadCount },
  ];

  return (
    <nav className="flex flex-col mt-1">
      {links.map(({ href, label, Icon, badge }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`relative flex items-center justify-center xl:justify-start gap-4 rounded-full p-3 transition-colors hover:bg-white/10 w-full xl:w-fit ${isActive ? "font-bold" : ""}`}
          >
            <span className="relative">
              <Icon solid={isActive} />
              {badge != null && badge > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-sky-500 text-white text-[11px] font-bold flex items-center justify-center leading-none">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </span>
            <span className="hidden xl:inline text-xl pr-4">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
