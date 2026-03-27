import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const PASSWORD = "TestTest#";

const USERS = [
  { name: "Facundo Falcioni", username: "facu2410", email: "facundofalcioni2410@gmail.com", bio: "Building cool stuff one commit at a time." },
  { name: "Alice Johnson", username: "alicej", email: "alice@example.com", bio: "Frontend dev & coffee addict ☕" },
  { name: "Bob Smith", username: "bobsmith", email: "bob@example.com", bio: null },
  { name: "Carol White", username: "carolw", email: "carol@example.com", bio: "Designer. Dog lover. Dark mode only." },
  { name: "David Lee", username: "davidlee", email: "david@example.com", bio: "Full-stack engineer. TypeScript or nothing." },
  { name: "Emma Brown", username: "emmab", email: "emma@example.com", bio: "Open source contributor & cat enthusiast 🐱" },
  { name: "Frank Garcia", username: "frankg", email: "frank@example.com", bio: null },
  { name: "Grace Kim", username: "gracek", email: "grace@example.com", bio: "React & accessibility advocate" },
  { name: "Henry Wilson", username: "henryw", email: "henry@example.com", bio: "Backend engineer. Postgres fanboy." },
  { name: "Isabel Martinez", username: "isabelm", email: "isabel@example.com", bio: "DevOps & cloud infrastructure ☁️" },
];

const TWEETS: string[][] = [
  // facu2410
  ["Just shipped my Twitter clone built with Next.js, Prisma and Tailwind. Feels good 🚀", "TypeScript really does make everything better. No cap.", "Dark mode is not optional. It's a lifestyle."],
  // alicej
  ["CSS Flexbox changed my life and I will die on this hill.", "Hot take: pair programming beats solo debugging every single time.", "Today I learned you can chain optional chaining operators. My brain is melting."],
  // bobsmith
  ["Spent 3 hours debugging. The problem was a missing semicolon. I quit.", "Coffee → Code → Sleep → Repeat", "Why write comments when you can write clean code that explains itself?"],
  // carolw
  ["Good design is invisible. Bad design is all you can see.", "Spacing and typography are doing 80% of the work in any UI.", "Always prototype before you build. Seriously. Always."],
  // davidlee
  ["Prisma 7 + Next.js App Router is genuinely the best DX I've had in years.", "Server Components changed how I think about data fetching. Never going back.", "Zod for everything. Validate at the boundary, trust in the middle."],
  // emmab
  ["Opened a PR today with 500 lines of tests and 50 lines of code. Peak engineering.", "Every time you skip writing tests, a puppy cries. Don't make puppies cry.", "The best code I've ever written was code I deleted."],
  // frankg
  ["git commit -m 'fix' for the 14th time today", "I don't always test my code, but when I do, I do it in production.", "Stack Overflow is down. I am effectively useless."],
  // gracek
  ["Accessibility is not a feature, it's a requirement.", "If your app isn't usable with a keyboard, it's broken. Full stop.", "useReducer is just useState for people who like to feel smart."],
  // henryw
  ["Indexes. Use them. Your future self will thank you.", "Cursor-based pagination is always the right answer.", "SQL is not scary. SQL is your friend. Learn SQL."],
  // isabelm
  ["Containers are great until you spend 2 days debugging a volume mount.", "Infrastructure as code is the only sane way to manage infra. Change my mind.", "If it's not in a pipeline, it doesn't exist."],
];

// ── helpers ──────────────────────────────────────────────────────────────────

/** Random date between `daysAgo` days ago and now. */
function randomDate(daysAgo: number): Date {
  const now = Date.now();
  const oldest = now - daysAgo * 24 * 60 * 60 * 1000;
  return new Date(oldest + Math.random() * (now - oldest));
}

/** Pick `n` distinct random indices from [0, max), excluding `exclude`. */
function pickRandom(max: number, n: number, exclude: number[] = []): number[] {
  const pool = Array.from({ length: max }, (_, i) => i).filter(
    (i) => !exclude.includes(i)
  );
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const force = process.argv.includes("--force");
  const existing = await prisma.user.count();
  if (existing > 0 && !force) {
    console.log("⏭  Database already has data, skipping seed. Use --force to override.");
    return;
  }

  console.log("🌱 Seeding database...\n");

  // Full clean
  await prisma.like.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.tweet.deleteMany();
  await prisma.user.deleteMany();
  console.log("  🗑  Cleared all data\n");

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // ── Create users + tweets ──────────────────────────────────────────────────
  const ids: string[] = [];
  const tweetsByUser: string[][] = [];

  for (let i = 0; i < USERS.length; i++) {
    const user = await prisma.user.create({ data: { ...USERS[i], passwordHash } });
    const tweets = await prisma.$transaction(
      TWEETS[i].map((content) =>
        prisma.tweet.create({ data: { content, authorId: user.id, createdAt: randomDate(7) }, select: { id: true } })
      )
    );
    ids.push(user.id);
    tweetsByUser.push(tweets.map((t) => t.id));
    console.log(`  ✓ ${user.name} (@${user.username})`);
  }

  // ── Follows ───────────────────────────────────────────────────────────────
  // Each user follows 3-6 others at random; facu2410 (index 0) is boosted to be
  // followed by more people (gives the home timeline a realistic density).
  console.log("\n  Creating follow relationships...");

  const followPairs = new Set<string>(); // "followerIdx,followingIdx"

  const addFollow = (f: number, t: number) => {
    if (f === t) return;
    followPairs.add(`${f},${t}`);
  };

  // facu2410 is "popular" — everyone else follows him
  for (let i = 1; i < USERS.length; i++) addFollow(i, 0);

  // facu2410 follows most others back
  for (const i of pickRandom(USERS.length, 7, [0])) addFollow(0, i);

  // Every user follows a random 3-5 others (self and already-covered handled)
  for (let i = 0; i < USERS.length; i++) {
    const count = 3 + Math.floor(Math.random() * 3); // 3–5
    for (const j of pickRandom(USERS.length, count, [i])) addFollow(i, j);
  }

  for (const pair of followPairs) {
    const [fi, ti] = pair.split(",").map(Number);
    await prisma.$transaction([
      prisma.follow.create({ data: { followerId: ids[fi], followingId: ids[ti] } }),
      prisma.user.update({ where: { id: ids[fi] }, data: { followingCount: { increment: 1 } } }),
      prisma.user.update({ where: { id: ids[ti] }, data: { followersCount: { increment: 1 } } }),
    ]);
  }

  // ── Likes ─────────────────────────────────────────────────────────────────
  // Each tweet gets 2-5 random likes (no self-likes, no duplicates).
  console.log("\n  Creating likes...");

  const likePairs = new Set<string>(); // "userId,tweetId"

  for (let authorIdx = 0; authorIdx < USERS.length; authorIdx++) {
    for (let tweetIdx = 0; tweetIdx < tweetsByUser[authorIdx].length; tweetIdx++) {
      const tweetId = tweetsByUser[authorIdx][tweetIdx];
      const likeCount = 2 + Math.floor(Math.random() * 4); // 2–5
      const likers = pickRandom(USERS.length, likeCount, [authorIdx]);

      for (const likerIdx of likers) {
        const key = `${ids[likerIdx]},${tweetId}`;
        if (likePairs.has(key)) continue;
        likePairs.add(key);

        await prisma.$transaction([
          prisma.like.create({ data: { userId: ids[likerIdx], tweetId } }),
          prisma.tweet.update({ where: { id: tweetId }, data: { likeCount: { increment: 1 } } }),
        ]);
      }
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n  Follow summary:");
  const users = await prisma.user.findMany({
    select: { username: true, followersCount: true, followingCount: true },
  });
  for (const u of users) {
    console.log(`    @${u.username.padEnd(12)} ${u.followersCount} followers, ${u.followingCount} following`);
  }

  const totalLikes = await prisma.like.count();
  console.log(
    `\n✅ Done. ${USERS.length} users · ${USERS.length * 3} tweets · ${followPairs.size} follows · ${totalLikes} likes`
  );
  console.log(`   Password for all accounts: ${PASSWORD}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
