import { redirect } from "next/navigation";
import { requireAuth } from "@/app/lib/session";
import { prisma } from "@/app/lib/db";
import Sidebar from "@/app/components/layout/Sidebar";
import MobileNav from "@/app/components/layout/MobileNav";
import RightSidebar from "@/app/components/layout/RightSidebar";
import SSEProvider from "@/app/components/layout/SSEProvider";
import NotificationToast from "@/app/components/notifications/NotificationToast";
import { getUnreadCount } from "@/app/actions/notifications";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();
  const [user, initialUnreadCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { username: true, name: true, avatarUrl: true },
    }),
    getUnreadCount(),
  ]);

  if (!user) {
    redirect("/api/auth/signout");
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <SSEProvider userId={session.userId} />
      <NotificationToast />

      {/* Desktop/tablet sidebar */}
      <Sidebar user={user} initialUnreadCount={initialUnreadCount} />

      {/* Mobile header + drawer */}
      <MobileNav user={user} />

      {/* Main content — pushed right to clear sidebar on sm+ */}
      <div className="sm:pl-[68px] xl:pl-[275px] flex items-start">
        <div className="flex-1 min-w-0 min-h-screen border-x border-zinc-800">
          {children}
        </div>
        <RightSidebar currentUserId={session.userId} />
      </div>
    </div>
  );
}
