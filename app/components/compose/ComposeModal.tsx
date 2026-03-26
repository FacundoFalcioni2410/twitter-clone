"use client";

import Modal from "@/app/components/ui/Modal";
import ComposeBox from "@/app/components/compose/ComposeBox";

interface ComposeModalProps {
  user: { name: string; avatarUrl?: string | null };
  onClose: () => void;
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M10.59 12L4.54 5.96l1.42-1.42L12 10.59l6.04-6.05 1.42 1.42L13.41 12l6.05 6.04-1.42 1.42L12 13.41l-6.04 6.05-1.42-1.42L10.59 12z" />
    </svg>
  );
}

export default function ComposeModal({ user, onClose }: ComposeModalProps) {
  return (
    <Modal onClose={onClose}>
      <div className="flex items-center px-4 pt-3 pb-1">
        <button
          onClick={onClose}
          aria-label="Close"
          className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <CloseIcon />
        </button>
      </div>
      <ComposeBox user={user} autoFocus onClose={onClose} />
    </Modal>
  );
}
