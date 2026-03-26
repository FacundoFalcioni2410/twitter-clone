"use client";

import { useState } from "react";
import Link from "next/link";
import { register } from "@/app/actions/auth";
import { useAction } from "@/app/hooks/useAction";
import { ROUTES } from "@/app/lib/types";

export default function RegisterForm() {
  const [error, setError] = useState<string | null>(null);

  const { execute, isPending } = useAction(register, {
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
        <h1 className="text-2xl font-bold text-white mt-4">Create your account</h1>
      </div>

      {error && (
        <p className="text-red-500 text-sm text-center bg-red-500/10 rounded-lg p-3">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm text-zinc-400">Display name</label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={50}
          autoComplete="name"
          className="rounded-md border border-zinc-700 bg-transparent px-3 py-2 text-white placeholder-zinc-600 focus:border-sky-500 focus:outline-none"
          placeholder="Your name"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="username" className="text-sm text-zinc-400">Username</label>
        <div className="flex items-center rounded-md border border-zinc-700 bg-transparent px-3 py-2 focus-within:border-sky-500">
          <span className="text-zinc-600 mr-1">@</span>
          <input
            id="username"
            name="username"
            type="text"
            required
            maxLength={20}
            autoComplete="username"
            className="flex-1 bg-transparent text-white placeholder-zinc-600 focus:outline-none"
            placeholder="username"
          />
        </div>
      </div>

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
          autoComplete="new-password"
          className="rounded-md border border-zinc-700 bg-transparent px-3 py-2 text-white placeholder-zinc-600 focus:border-sky-500 focus:outline-none"
          placeholder="Min. 8 chars, 1 uppercase, 1 special"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="mt-2 rounded-full bg-white py-2 font-bold text-black transition hover:bg-zinc-200 disabled:opacity-50"
      >
        {isPending ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href={ROUTES.LOGIN} className="text-sky-500 hover:underline">Sign in</Link>
      </p>
    </form>
  );
}
