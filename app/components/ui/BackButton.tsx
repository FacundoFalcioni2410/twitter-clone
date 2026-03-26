"use client";

import { useRouter } from "next/navigation";
import { BackIcon } from "@/app/components/ui/icons";

export default function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      aria-label="Go back"
      className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
    >
      <BackIcon />
    </button>
  );
}
