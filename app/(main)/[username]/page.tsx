import { notFound } from "next/navigation";
import { getCurrentUser } from "@/app/lib/session";
import { getUserByUsername } from "@/app/actions/users";
import Avatar from "@/app/components/ui/Avatar";
import BackButton from "@/app/components/ui/BackButton";
import EditProfileButton from "@/app/components/profile/EditProfileButton";
import { CalendarIcon } from "@/app/components/ui/icons";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const user = await getUserByUsername(username);
  if (!user) return { title: "Profile not found · X" };
  return { title: `${user.name} (@${user.username}) · X` };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const [session, profile] = await Promise.all([
    getCurrentUser(),
    getUserByUsername(username),
  ]);

  if (!profile) notFound();

  const isOwnProfile = session?.username === profile.username;
  const joinedDate = new Date(profile.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <>
      {/* Sticky header */}
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm px-4 py-3 border-b border-zinc-800 flex items-center gap-4">
        <BackButton />
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-xl leading-tight truncate">{profile.name}</h1>
          <p className="text-zinc-500 text-sm">0 posts</p>
        </div>
        {/* intentionally empty — logout is in the sidebar */}
      </header>

      {/* Banner */}
      <div className="h-[130px] sm:h-[200px] bg-zinc-800" />

      {/* Avatar row */}
      <div className="px-4">
        <div className="flex items-end justify-between -mt-[46px] sm:-mt-[60px] mb-3">
          <div className="border-4 border-black rounded-full">
            <Avatar name={profile.name} avatarUrl={profile.avatarUrl} size="xl" />
          </div>
          {isOwnProfile ? (
            <EditProfileButton user={profile} />
          ) : (
            <button className="mt-[52px] sm:mt-[68px] px-4 py-1.5 rounded-full bg-white text-black font-bold text-sm hover:bg-zinc-200 transition-colors">
              Follow
            </button>
          )}
        </div>

        {/* Profile info */}
        <h2 className="font-bold text-xl leading-tight">{profile.name}</h2>
        <p className="text-zinc-500">@{profile.username}</p>

        {profile.bio && <p className="mt-3 text-[15px]">{profile.bio}</p>}

        <div className="flex items-center gap-1 mt-3 text-zinc-500 text-sm">
          <CalendarIcon />
          <span>Joined {joinedDate}</span>
        </div>

        <div className="flex gap-5 mt-3 text-sm">
          <span>
            <strong className="text-white">0</strong>{" "}
            <span className="text-zinc-500">Following</span>
          </span>
          <span>
            <strong className="text-white">0</strong>{" "}
            <span className="text-zinc-500">Followers</span>
          </span>
        </div>
      </div>

      {/* Posts tab */}
      <div className="flex mt-4 border-b border-zinc-800">
        <div className="flex-1 flex justify-center py-4">
          <span className="font-bold border-b-2 border-sky-500 pb-4">Posts</span>
        </div>
      </div>

      {/* Empty state */}
      <div className="px-8 py-16 text-center">
        <h3 className="font-extrabold text-3xl mb-2">
          {isOwnProfile ? "You haven't posted yet" : `@${profile.username} hasn't posted yet`}
        </h3>
        <p className="text-zinc-500">
          When they post, their posts will show up here.
        </p>
      </div>
    </>
  );
}
