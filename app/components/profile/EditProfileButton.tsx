"use client";

import { useState } from "react";
import EditProfileModal from "@/app/components/profile/EditProfileModal";

interface EditProfileButtonProps {
  user: { name: string; bio?: string | null; avatarUrl?: string | null; headerUrl?: string | null };
}

export default function EditProfileButton({ user }: EditProfileButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-[52px] sm:mt-[68px] px-4 py-1.5 rounded-full border border-zinc-600 font-bold text-sm hover:bg-zinc-900 transition-colors"
      >
        Edit profile
      </button>
      {open && (
        <EditProfileModal user={user} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
