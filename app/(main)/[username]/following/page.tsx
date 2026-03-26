import { notFound } from "next/navigation";
import { getCurrentUser } from "@/app/lib/session";
import { getUserByUsername } from "@/app/actions/users";
import { getFollowing } from "@/app/actions/follows";
import BackButton from "@/app/components/ui/BackButton";
import FollowUserRow from "@/app/components/profile/FollowUserRow";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const user = await getUserByUsername(username);
  if (!user) return { title: "Profile not found · X" };
  return { title: `People followed by ${user.name} (@${user.username}) · X` };
}

export default async function FollowingPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const [session, profile] = await Promise.all([getCurrentUser(), getUserByUsername(username)]);
  if (!profile) notFound();

  const users = await getFollowing(profile.id);
  const currentUserId = session?.userId ?? "";

  return (
    <>
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm px-4 py-3 border-b border-zinc-800 flex items-center gap-4">
        <BackButton />
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-xl leading-tight truncate">{profile.name}</h1>
          <p className="text-zinc-500 text-sm">@{profile.username}</p>
        </div>
      </header>

      <div className="flex border-b border-zinc-800">
        <div className="flex-1 flex justify-center py-4">
          <span className="text-sm font-bold border-b-2 border-sky-500 pb-4">Following</span>
        </div>
        <a href={`/${username}/followers`} className="flex-1 flex justify-center py-4 text-zinc-500 hover:bg-white/5 transition-colors">
          <span className="text-sm font-medium">Followers</span>
        </a>
      </div>

      {users.length === 0 ? (
        <p className="text-zinc-500 text-center py-16">Not following anyone yet.</p>
      ) : (
        <div>
          {users.map((user) => (
            <FollowUserRow key={user.id} user={user} currentUserId={currentUserId} />
          ))}
        </div>
      )}
    </>
  );
}
