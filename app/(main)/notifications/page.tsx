import { getNotifications, markAllRead } from "@/app/actions/notifications";
import NotificationsList from "@/app/components/notifications/NotificationsList";

export default async function NotificationsPage() {
  const { data, nextCursor } = await getNotifications();

  // Mark all as read when the page is visited
  await markAllRead();

  return (
    <div>
      <div className="sticky top-0 z-10 backdrop-blur-md bg-black/70 border-b border-zinc-800 px-4 py-3">
        <h1 className="font-bold text-xl">Notifications</h1>
      </div>

      <NotificationsList initialNotifications={data} initialNextCursor={nextCursor} />
    </div>
  );
}
