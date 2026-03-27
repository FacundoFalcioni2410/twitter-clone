"use client";

import { useState, useTransition, useEffect } from "react";
import TweetCard from "@/app/components/tweets/TweetCard";
import { getReplyChains, type Tweet, type ReplyChain } from "@/app/actions/tweets";

const BATCH = 3;

interface ThreadRepliesProps {
  tweetId: string;
  initialChains: ReplyChain[];
  initialNextCursor: string | null;
  currentUserId: string;
}

export default function ThreadReplies({
  tweetId,
  initialChains,
  initialNextCursor,
  currentUserId,
}: ThreadRepliesProps) {
  const [chains, setChains] = useState<ReplyChain[]>(initialChains);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const handler = (e: Event) => {
      const { reply, parentId } = (e as CustomEvent<{ reply: Tweet; parentId: string }>).detail;

      // Reply to focused tweet → new direct reply chain
      if (parentId === tweetId) {
        setChains((prev) =>
          prev.some((c) => c.tweet.id === reply.id)
            ? prev
            : [...prev, { tweet: reply, firstChild: null, hasMoreSiblings: false, grandchild: null, hasMoreGrandchildren: false }]
        );
        return;
      }

      // Reply to a direct reply → becomes firstChild
      setChains((prev) =>
        prev.map((c) => {
          if (c.tweet.id === parentId && !c.firstChild) {
            return { ...c, firstChild: reply };
          }
          // Reply to firstChild → becomes grandchild
          if (c.firstChild?.id === parentId && !c.grandchild) {
            return { ...c, grandchild: reply };
          }
          return c;
        })
      );
    };
    window.addEventListener("reply-posted", handler);
    return () => window.removeEventListener("reply-posted", handler);
  }, [tweetId]);

  const handleDelete = (id: string) => {
    setChains((prev) => {
      const chain = prev.find((c) => c.tweet.id === id);
      // If the deleted tweet has visible children, keep the chain —
      // TweetCard shows the "unavailable" placeholder via its own local state.
      if (chain?.firstChild) return prev;
      return prev.filter((c) => c.tweet.id !== id);
    });
  };

  const loadMore = () => {
    if (!nextCursor || isPending) return;
    startTransition(async () => {
      const result = await getReplyChains(tweetId, { cursor: nextCursor, limit: BATCH });
      setChains((prev) => [...prev, ...result.data]);
      setNextCursor(result.nextCursor);
    });
  };

  if (chains.length === 0) {
    return <div className="px-8 py-12 text-center text-zinc-500">No replies yet.</div>;
  }

  return (
    <>
      {chains.map(({ tweet, firstChild, hasMoreSiblings, grandchild, hasMoreGrandchildren }, index) => (
        <div key={tweet.id} className={index > 0 ? "border-t-4 border-zinc-900" : ""}>
          {/* Direct reply */}
          <TweetCard
            tweet={tweet}
            currentUserId={currentUserId}
            onDelete={handleDelete}
            hasConnector={firstChild !== null}
          />

          {/* First child */}
          {firstChild && (
            <TweetCard
              tweet={firstChild}
              currentUserId={currentUserId}
              hasConnector={grandchild !== null}
            />
          )}

          {/* Grandchild */}
          {grandchild && (
            <TweetCard
              tweet={grandchild}
              currentUserId={currentUserId}
              hasConnector={hasMoreGrandchildren}
            />
          )}

          {/* More beyond grandchild */}
          {hasMoreGrandchildren && grandchild && (
            <a
              href={`/${grandchild.author.username}/status/${grandchild.id}`}
              className="block w-full py-3 pl-[72px] text-sky-500 text-sm hover:bg-white/[0.03] transition-colors border-b border-zinc-800"
            >
              Show more replies
            </a>
          )}

          {/* More siblings of firstChild */}
          {hasMoreSiblings && firstChild && !grandchild && (
            <a
              href={`/${tweet.author.username}/status/${tweet.id}`}
              className="block w-full py-3 pl-[72px] text-sky-500 text-sm hover:bg-white/[0.03] transition-colors border-b border-zinc-800"
            >
              Show more replies
            </a>
          )}
        </div>
      ))}

      {nextCursor && (
        <button
          onClick={loadMore}
          disabled={isPending}
          className="w-full py-4 text-sky-500 text-sm font-medium hover:bg-white/[0.03] transition-colors border-b border-zinc-800 disabled:opacity-50"
        >
          {isPending ? "Loading…" : "Show more replies"}
        </button>
      )}
    </>
  );
}
