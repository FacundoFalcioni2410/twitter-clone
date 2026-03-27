"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Modal from "@/app/components/ui/Modal";
import Avatar from "@/app/components/ui/Avatar";
import { updateProfile } from "@/app/actions/users";
import { useAction } from "@/app/hooks/useAction";
import { useRouter } from "next/navigation";

interface EditProfileModalProps {
  user: { name: string; bio?: string | null; avatarUrl?: string | null; headerUrl?: string | null };
  onClose: () => void;
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M10.59 12L4.54 5.96l1.42-1.42L12 10.59l6.04-6.05 1.42 1.42L13.41 12l6.05 6.04-1.42 1.42L12 13.41l-6.04 6.05-1.42-1.42L10.59 12z" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z" />
      <path d="M9 3L7.17 5H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2h-3.17L15 3H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
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

async function uploadImage(file: File, type: "avatar" | "header"): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("type", type);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Upload failed");
  return json.url as string;
}

export default function EditProfileModal({ user, onClose }: EditProfileModalProps) {
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? null);
  const [headerUrl, setHeaderUrl] = useState(user.headerUrl ?? null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingHeader, setUploadingHeader] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const headerInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const { execute, isPending } = useAction(updateProfile, {
    onSuccess: () => {
      router.refresh();
      onClose();
    },
    onError: setError,
  });

  const handleImageSelect = async (file: File, type: "avatar" | "header") => {
    setUploadError(null);
    const setter = type === "avatar" ? setUploadingAvatar : setUploadingHeader;
    setter(true);
    try {
      const url = await uploadImage(file, type);
      if (type === "avatar") setAvatarUrl(url);
      else setHeaderUrl(url);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setter(false);
    }
  };

  const isUploading = uploadingAvatar || uploadingHeader;

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
          onClick={() => execute({ name, bio, avatarUrl, headerUrl })}
          disabled={isPending || isUploading || !name.trim()}
          className="px-4 py-1.5 rounded-full bg-white text-black font-bold text-sm hover:bg-zinc-200 transition-colors disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
      </div>

      {/* Banner */}
      <div
        className="relative h-[120px] bg-zinc-800 overflow-hidden cursor-pointer group"
        onClick={() => headerInputRef.current?.click()}
      >
        {headerUrl && (
          <Image src={headerUrl} alt="Header" fill className="object-cover" />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          {uploadingHeader ? (
            <div className="w-6 h-6 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <span className="text-white"><CameraIcon /></span>
          )}
        </div>
        <input
          ref={headerInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageSelect(file, "header");
            e.target.value = "";
          }}
        />
      </div>

      {/* Avatar */}
      <div className="px-4 -mt-9 mb-5">
        <div
          className="relative border-4 border-black rounded-full w-fit cursor-pointer group"
          onClick={() => avatarInputRef.current?.click()}
        >
          <Avatar name={user.name} avatarUrl={avatarUrl} size="xl" />
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            {uploadingAvatar ? (
              <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <span className="text-white"><CameraIcon /></span>
            )}
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageSelect(file, "avatar");
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {/* Fields */}
      <div className="px-4 pb-5 flex flex-col gap-4">
        {(error || uploadError) && (
          <p className="text-red-500 text-sm text-center bg-red-500/10 rounded-lg p-3">
            {error ?? uploadError}
          </p>
        )}
        <FloatingField label="Name" maxLength={50} value={name} onChange={setName} />
        <FloatingField label="Bio" maxLength={160} value={bio} onChange={setBio} multiline />
      </div>
    </Modal>
  );
}
