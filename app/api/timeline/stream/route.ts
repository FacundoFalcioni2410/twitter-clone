import { getCurrentUser } from "@/app/lib/session";
import { addSSEClient } from "@/app/lib/sse";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentUser();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const encoder = new TextEncoder();
  let removeClient: (() => void) | undefined;
  let keepalive: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const enqueue = (chunk: string) => controller.enqueue(encoder.encode(chunk));

      removeClient = addSSEClient({ userId: session.userId, enqueue });

      enqueue(": connected\n\n");

      // Keepalive comment every 25 s — prevents proxies from dropping idle connections
      keepalive = setInterval(() => {
        try {
          enqueue(": keepalive\n\n");
        } catch {
          clearInterval(keepalive);
        }
      }, 25_000);
    },
    cancel() {
      removeClient?.();
      clearInterval(keepalive);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
