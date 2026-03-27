export type ActionResult<T = null> =
  | { data: T; error: null }
  | { data: null; error: string };

export const ROUTES = {
  HOME: "/home",
  LOGIN: "/login",
  REGISTER: "/register",
  PROFILE: (username: string) => `/${username}`,
  SEARCH: "/search",
} as const;

export type JWTPayload = {
  userId: string;
  username: string;
};

export type TweetAuthor = {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
};

export type Tweet = {
  id: string;
  content: string;
  attachmentUrl: string | null;
  likeCount: number;
  replyCount: number;
  parentId: string | null;
  isLiked: boolean;
  deleted: boolean;
  createdAt: string;
  author: TweetAuthor;
};

export type ReplyChain = {
  tweet: Tweet;
  firstChild: Tweet | null;
  hasMoreSiblings: boolean;
  grandchild: Tweet | null;
  hasMoreGrandchildren: boolean;
};

export type NotificationPayload = {
  id: string;
  type: "LIKE" | "FOLLOW" | "REPLY";
  actor: { id: string; username: string; name: string; avatarUrl: string | null };
  tweetId: string | null;
  tweetContent: string | null;
  read: boolean;
  createdAt: string;
};
