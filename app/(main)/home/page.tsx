import { requireAuth } from "@/app/lib/session";

export const metadata = { title: "Home · X" };

export default async function HomePage() {
  await requireAuth();

  return (
    <>
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm px-4 py-3 border-b border-zinc-800">
        <h1 className="font-bold text-xl">Home</h1>
      </header>

      <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
        <p className="text-zinc-500 text-lg">Timeline coming soon.</p>
      </div>
    </>
  );
}
