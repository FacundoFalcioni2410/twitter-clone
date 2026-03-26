"use client";

import { useState } from "react";
import Modal from "@/app/components/ui/Modal";
import Avatar from "@/app/components/ui/Avatar";
import { updateProfile } from "@/app/actions/users";
import { useAction } from "@/app/hooks/useAction";
import { useRouter } from "next/navigation";

interface EditProfileModalProps {
  user: { name: string; bio?: string | null; avatarUrl?: string | null };
  onClose: () => void;
}


function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M10.59 12L4.54 5.96l1.42-1.42L12 10.59l6.04-6.05 1.42 1.42L13.41 12l6.05 6.04-1.42 1.42L12 13.41l-6.04 6.05-1.42-1.42L10.59 12z" />
    </svg>
  );
}

function FloatingField({
  label,
  maxLength,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  maxLength: number;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  const remaining = maxLength - value.length;
  const Tag = multiline ? "textarea" : "input";

  return (
    <div className="relative border border-zinc-700 rounded-md px-3 pt-6 pb-2 focus-within:border-sky-500 transition-colors">
      <label className="absolute top-1.5 left-3 text-xs text-zinc-500">{label}</label>
      <Tag
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        maxLength={maxLength}
        rows={multiline ? 3 : undefined}
        className="w-full bg-transparent text-white focus:outline-none resize-none"
      />
      <span className="absolute top-1.5 right-3 text-xs text-zinc-500">{remaining}</span>
    </div>
  );
}

export default function EditProfileModal({ user, onClose }: EditProfileModalProps) {
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio ?? "");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const { execute, isPending } = useAction(updateProfile, {
    onSuccess: () => {
      router.refresh();
      onClose();
    },
    onError: setError,
  });

  return (
    <Modal onClose={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-5">
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <CloseIcon />
          </button>
          <h2 className="font-bold text-xl">Edit profile</h2>
        </div>
        <button
          onClick={() => execute({ name, bio })}
          disabled={isPending || !name.trim()}
          className="px-4 py-1.5 rounded-full bg-white text-black font-bold text-sm hover:bg-zinc-200 transition-colors disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
      </div>

      {/* Banner */}
      <div className="h-[120px] bg-zinc-800" />

      {/* Avatar */}
      <div className="px-4 -mt-9 mb-5">
        <div className="border-4 border-black rounded-full w-fit">
          <Avatar name={user.name} avatarUrl={user.avatarUrl} size="xl" />
        </div>
      </div>

      {/* Fields */}
      <div className="px-4 pb-5 flex flex-col gap-4">
        {error && (
          <p className="text-red-500 text-sm text-center bg-red-500/10 rounded-lg p-3">{error}</p>
        )}
        <FloatingField
          label="Name"
          maxLength={50}
          value={name}
          onChange={setName}
        />
        <FloatingField
          label="Bio"
          maxLength={160}
          value={bio}
          onChange={setBio}
          multiline
        />
      </div>
    </Modal>
  );
}
