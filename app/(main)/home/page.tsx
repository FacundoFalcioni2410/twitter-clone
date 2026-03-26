import { requireAuth } from "@/app/lib/session";
import { prisma } from "@/app/lib/db";
import { getTimeline } from "@/app/actions/tweets";
import Timeline from "@/app/components/tweets/Timeline";

export const metadata = { title: "Home · X" };

export default async function HomePage() {
  const session = await requireAuth();

  const [user, { data: tweets, nextCursor }] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: session.userId },
      select: { name: true, avatarUrl: true },
    }),
    getTimeline(),
  ]);

  return (
    <>
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm px-4 py-3 border-b border-zinc-800">
        <h1 className="font-bold text-xl">Home</h1>
      </header>

      <Timeline
        initialTweets={tweets}
        initialNextCursor={nextCursor}
        currentUserId={session.userId}
        user={user}
      />
    </>
  );
}
