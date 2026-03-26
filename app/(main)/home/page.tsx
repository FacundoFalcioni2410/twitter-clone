import { requireAuth } from "@/app/lib/session";
import { prisma } from "@/app/lib/db";
import ComposeBox from "@/app/components/compose/ComposeBox";

export const metadata = { title: "Home · X" };

export default async function HomePage() {
  const session = await requireAuth();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.userId },
    select: { name: true, avatarUrl: true },
  });

  return (
    <>
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm px-4 py-3 border-b border-zinc-800">
        <h1 className="font-bold text-xl">Home</h1>
      </header>

      <div className="border-b border-zinc-800">
        <ComposeBox user={user} />
      </div>

      <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
        <p className="text-zinc-500 text-lg">No posts yet.</p>
      </div>
    </>
  );
}
