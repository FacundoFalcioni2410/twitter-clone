"use client";

import { useState, useTransition, useEffect } from "react";
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

export default function SearchClient() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [isPending, startTransition] = useTransition();
  const [lastSearchedQuery, setLastSearchedQuery] = useState("");

  useEffect(() => {
    if (!query.trim()) return;
    const timer = setTimeout(() => {
      startTransition(async () => {
        const users = await searchUsers(query);
        setResults(users);
        setLastSearchedQuery(query);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const trimmed = query.trim();
  const searched = trimmed.length > 0 && lastSearchedQuery === trimmed && !isPending;

  return (
    <div>
      {/* Search input */}
      <div className="sticky top-0 bg-black/80 backdrop-blur-md border-b border-zinc-800 px-4 py-3 z-10">
        <div className="flex items-center gap-3 bg-zinc-900 rounded-full px-4 py-3 ring-1 ring-sky-500">
          <span className="text-sky-500">
            <SearchIcon />
          </span>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people"
            className="bg-transparent outline-none text-[15px] text-white placeholder:text-zinc-500 w-full"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setResults([]); setLastSearchedQuery(""); }}
              className="text-zinc-500 hover:text-white transition-colors"
            >
              <XIcon />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {isPending ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-sky-500 animate-spin" />
        </div>
      ) : searched && results.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center px-8">
          <p className="text-xl font-bold mb-1">No results for &ldquo;{query}&rdquo;</p>
          <p className="text-zinc-500 text-sm">Try searching for something else.</p>
        </div>
      ) : results.length > 0 ? (
        <div>
          {results.map((user) => (
            <Link
              key={user.id}
              href={`/${user.username}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-900 transition-colors border-b border-zinc-800/50"
            >
              <Avatar name={user.name} avatarUrl={user.avatarUrl} size="lg" />
              <div className="min-w-0">
                <p className="font-bold truncate">{user.name}</p>
                <p className="text-zinc-500 text-sm truncate">@{user.username}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-16 text-center px-8">
          <p className="text-xl font-bold mb-1">Search for people</p>
          <p className="text-zinc-500 text-sm">Find accounts by name or username.</p>
        </div>
      )}
    </div>
  );
}
