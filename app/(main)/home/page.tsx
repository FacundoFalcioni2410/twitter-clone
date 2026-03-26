import { requireAuth } from "@/app/lib/session";

export const metadata = { title: "Home · X" };

export default async function HomePage() {
  await requireAuth();

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-zinc-500">Timeline coming soon.</p>
    </main>
  );
}
