"use client";

import { useState, useTransition, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { searchUsers } from "@/app/actions/users";
import Avatar from "@/app/components/ui/Avatar";

type User = Awaited<ReturnType<typeof searchUsers>>[number];

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function RightSidebarSearch() {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [isPending, startTransition] = useTransition();
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!query.trim()) return;
    const timer = setTimeout(() => {
      startTransition(async () => {
        const users = await searchUsers(query);
        setResults(users);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  if (pathname === "/search") return null;

  const showDropdown = focused && query.trim().length > 0;

  return (
    <div className="relative mb-4">
      <div
        className={`flex items-center gap-3 rounded-full px-4 py-3 transition-colors ${
          focused
            ? "bg-black ring-1 ring-sky-500"
            : "bg-zinc-900 hover:bg-zinc-800"
        }`}
      >
        <span className={focused ? "text-sky-500" : "text-zinc-500"}>
          <SearchIcon />
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Search"
          className="bg-transparent outline-none text-[15px] text-white placeholder:text-zinc-500 w-full"
        />
        {query && (
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { setQuery(""); setResults([]); }}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <XIcon />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-black border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-50">
          {isPending ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 rounded-full border-2 border-zinc-700 border-t-sky-500 animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-6">
              No results for &ldquo;{query}&rdquo;
            </p>
          ) : (
            results.map((user) => (
              <Link
                key={user.id}
                href={`/${user.username}`}
                onClick={() => { setQuery(""); setResults([]); setFocused(false); }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-900 transition-colors"
              >
                <Avatar name={user.name} avatarUrl={user.avatarUrl} size="md" />
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{user.name}</p>
                  <p className="text-zinc-500 text-sm truncate">@{user.username}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
