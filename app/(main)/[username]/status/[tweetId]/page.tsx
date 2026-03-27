import { notFound } from "next/navigation";
import { getCurrentUser } from "@/app/lib/session";
import { getTweetById, getReplyChains, getParentChain } from "@/app/actions/tweets";
import BackButton from "@/app/components/ui/BackButton";
import TweetCard from "@/app/components/tweets/TweetCard";
import TweetDetail from "@/app/components/tweets/TweetDetail";
import ThreadReplies from "@/app/components/tweets/ThreadReplies";

export default async function TweetThreadPage({
  params,
}: {
  params: Promise<{ username: string; tweetId: string }>;
}) {
  const { tweetId } = await params;

  const [session, tweet, parentChain, { data: chains, nextCursor }] = await Promise.all([
    getCurrentUser(),
    getTweetById(tweetId),
    getParentChain(tweetId),
    getReplyChains(tweetId, { limit: 3 }),
  ]);

  if (!tweet) notFound();

  const currentUserId = session?.userId ?? "";

  return (
    <>
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm px-4 py-3 border-b border-zinc-800 flex items-center gap-4">
        <BackButton />
        <h1 className="font-bold text-xl">Post</h1>
      </header>

      {parentChain.map((parentTweet, i) => (
        <TweetCard
          key={parentTweet.id}
          tweet={parentTweet}
          currentUserId={currentUserId}
          hasConnector={i < parentChain.length}
        />
      ))}

      <TweetDetail tweet={tweet} currentUserId={currentUserId} />

      <ThreadReplies
        tweetId={tweetId}
        initialChains={chains}
        initialNextCursor={nextCursor}
        currentUserId={currentUserId}
      />
    </>
  );
}
