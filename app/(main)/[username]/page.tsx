import { notFound } from "next/navigation";
import { getCurrentUser } from "@/app/lib/session";
import { getUserByUsername } from "@/app/actions/users";
import { getUserTweets, getLikedTweets } from "@/app/actions/tweets";
import { getIsFollowing } from "@/app/actions/follows";
import { prisma } from "@/app/lib/db";
import Avatar from "@/app/components/ui/Avatar";
import BackButton from "@/app/components/ui/BackButton";
import EditProfileButton from "@/app/components/profile/EditProfileButton";
import FollowButton from "@/app/components/profile/FollowButton";
import ProfileFollowCounts from "@/app/components/profile/ProfileFollowCounts";
import ProfileTabs from "@/app/components/profile/ProfileTabs";
import ProfileTweets from "@/app/components/tweets/ProfileTweets";
import ProfileLikes from "@/app/components/tweets/ProfileLikes";
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
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { username } = await params;
  const { tab = "posts" } = await searchParams;
  const isLikesTab = tab === "likes";

  const [session, profile] = await Promise.all([
    getCurrentUser(),
    getUserByUsername(username),
  ]);

  if (!profile) notFound();

  const isOwnProfile = session?.username === profile.username;
  const currentUserId = session?.userId ?? "";

  const [{ data: tweets, nextCursor }, tweetCount, isFollowing, followerRecord] = await Promise.all([
    isLikesTab ? getLikedTweets(profile.id) : getUserTweets(profile.id),
    prisma.tweet.count({ where: { authorId: profile.id } }),
    isOwnProfile ? Promise.resolve(false) : getIsFollowing(profile.id),
    (!isOwnProfile && session)
      ? prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: profile.id, followingId: session.userId } },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);
  const isFollowingViewer = !!followerRecord;

  const joinedDate = new Date(profile.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm px-4 py-3 border-b border-zinc-800 flex items-center gap-4">
        <BackButton />
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-xl leading-tight truncate">{profile.name}</h1>
          <p className="text-zinc-500 text-sm">
            {tweetCount} {tweetCount === 1 ? "post" : "posts"}
          </p>
        </div>
      </header>

      <div className="h-[130px] sm:h-[200px] bg-zinc-800" />

      <div className="px-4">
        <div className="flex items-end justify-between -mt-[46px] sm:-mt-[60px] mb-3">
          <div className="border-4 border-black rounded-full">
            <Avatar name={profile.name} avatarUrl={profile.avatarUrl} size="xl" />
          </div>
          <div data-testid="profile-actions">
            {isOwnProfile ? (
              <EditProfileButton user={profile} />
            ) : (
              <FollowButton
                targetUserId={profile.id}
                initialIsFollowing={isFollowing}
                className="mt-[52px] sm:mt-[68px]"
              />
            )}
          </div>
        </div>

        <h2 className="font-bold text-xl leading-tight">{profile.name}</h2>
        <div className="flex items-center gap-2">
          <p className="text-zinc-500">@{profile.username}</p>
          {isFollowingViewer && (
            <span className="text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-medium">
              Follows you
            </span>
          )}
        </div>

        {profile.bio && <p className="mt-3 text-[15px]">{profile.bio}</p>}

        <div className="flex items-center gap-1 mt-3 text-zinc-500 text-sm">
          <CalendarIcon />
          <span>Joined {joinedDate}</span>
        </div>

        <ProfileFollowCounts
          username={profile.username}
          profileUserId={profile.id}
          initialFollowingCount={profile.followingCount}
          initialFollowersCount={profile.followersCount}
        />
      </div>

      <ProfileTabs username={profile.username} />

      {isLikesTab ? (
        <ProfileLikes
          initialTweets={tweets}
          initialNextCursor={nextCursor}
          profileUserId={profile.id}
          currentUserId={currentUserId}
          username={profile.username}
        />
      ) : (
        <ProfileTweets
          initialTweets={tweets}
          initialNextCursor={nextCursor}
          profileUserId={profile.id}
          currentUserId={currentUserId}
          username={profile.username}
        />
      )}
    </>
  );
}
