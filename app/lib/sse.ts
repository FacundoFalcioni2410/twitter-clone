import type { Tweet, NotificationPayload } from "@/app/lib/types";

type SSEClient = {
  userId: string;
  enqueue: (chunk: string) => void;
};

// Next.js can bundle server actions and route handlers into separate module
// instances, giving each their own module-level variables. Using globalThis
// ensures a single shared registry across the entire Node.js process.
const g = globalThis as typeof globalThis & { _sseClients?: Set<SSEClient> };
if (!g._sseClients) g._sseClients = new Set();
const clients = g._sseClients;

export function addSSEClient(client: SSEClient): () => void {
  clients.add(client);
  return () => clients.delete(client);
}

function broadcast(payload: string) {
  for (const client of clients) {
    try {
      client.enqueue(payload);
    } catch {
      clients.delete(client);
    }
  }
}

/**
 * Push a new tweet to every connected client whose timeline should show it
 * (the author themselves + their followers).
 */
export async function broadcastTweet(tweet: Tweet): Promise<void> {
  if (clients.size === 0) return;

  const { prisma } = await import("@/app/lib/db");
  const follows = await prisma.follow.findMany({
    where: { followingId: tweet.author.id },
    select: { followerId: true },
  });

  const audienceIds = new Set([tweet.author.id, ...follows.map((f) => f.followerId)]);
  const payload = `event: tweet\ndata: ${JSON.stringify(tweet)}\n\n`;

  for (const client of clients) {
    if (audienceIds.has(client.userId)) {
      try {
        client.enqueue(payload);
      } catch {
        clients.delete(client);
      }
    }
  }
}

/**
 * Push an updated like count to all connected clients.
 * Each client ignores it if the tweet isn't in their local state.
 */
export function broadcastLike(tweetId: string, likeCount: number): void {
  if (clients.size === 0) return;
  broadcast(`event: like\ndata: ${JSON.stringify({ tweetId, likeCount })}\n\n`);
}

/**
 * Push an updated reply count to all connected clients.
 * Each client ignores it if the tweet isn't in their local state.
 */
export function broadcastReplyCount(tweetId: string, replyCount: number): void {
  if (clients.size === 0) return;
  broadcast(`event: replyCount\ndata: ${JSON.stringify({ tweetId, replyCount })}\n\n`);
}

/**
 * Push a notification to a specific connected user.
 */
export function broadcastNotification(recipientId: string, notification: NotificationPayload): void {
  if (clients.size === 0) return;
  const payload = `event: notification\ndata: ${JSON.stringify(notification)}\n\n`;
  for (const client of clients) {
    if (client.userId === recipientId) {
      try {
        client.enqueue(payload);
      } catch {
        clients.delete(client);
      }
    }
  }
}
