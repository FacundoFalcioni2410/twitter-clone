"use client";

import { useTransition } from "react";
import { logout } from "@/app/actions/auth";
import { LogoutIcon } from "@/app/components/ui/icons";

export default function LogoutButton({ compact = false }: { compact?: boolean }) {
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await logout();
    });
  };

  if (compact) {
    return (
      <button
        onClick={handleLogout}
        disabled={isPending}
        aria-label="Log out"
        className="p-2 rounded-full hover:bg-white/10 transition-colors text-zinc-500 hover:text-white disabled:opacity-50"
      >
        <LogoutIcon size={20} />
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isPending}
      className="flex items-center gap-4 rounded-full p-3 w-full transition-colors hover:bg-white/10 disabled:opacity-50"
    >
      <LogoutIcon />
      <span className="text-xl">Log out</span>
    </button>
  );
}
