"use client";

import { useState } from "react";
import Link from "next/link";
import { login } from "@/app/actions/auth";
import { useAction } from "@/app/hooks/useAction";
import { ROUTES } from "@/app/lib/types";

export default function LoginForm({ unauthorized }: { unauthorized?: boolean }) {
  const [error, setError] = useState<string | null>(null);

  const { execute, isPending } = useAction(login, {
    onError: setError,
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        execute(new FormData(e.currentTarget));
      }}
      className="flex flex-col gap-4"
    >
      <div className="text-center mb-2">
        <span className="text-3xl font-bold text-white">𝕏</span>
        <h1 className="text-2xl font-bold text-white mt-4">Sign in to X</h1>
      </div>

      {unauthorized && (
        <p className="text-amber-400 text-sm text-center bg-amber-400/10 rounded-lg p-3">
          Please sign in to continue.
        </p>
      )}

      {error && (
        <p className="text-red-500 text-sm text-center bg-red-500/10 rounded-lg p-3">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm text-zinc-400">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-md border border-zinc-700 bg-transparent px-3 py-2 text-white placeholder-zinc-600 focus:border-sky-500 focus:outline-none"
          placeholder="you@example.com"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm text-zinc-400">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded-md border border-zinc-700 bg-transparent px-3 py-2 text-white placeholder-zinc-600 focus:border-sky-500 focus:outline-none"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="mt-2 rounded-full bg-white py-2 font-bold text-black transition hover:bg-zinc-200 disabled:opacity-50"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-center text-sm text-zinc-500">
        Don&apos;t have an account?{" "}
        <Link href={ROUTES.REGISTER} className="text-sky-500 hover:underline">Sign up</Link>
      </p>
    </form>
  );
}
