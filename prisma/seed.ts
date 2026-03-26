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
  {
    name: "Facundo Falcioni",
    username: "facu2410",
    email: "facundofalcioni2410@gmail.com",
    bio: "Building cool stuff one commit at a time.",
  },
  {
    name: "Alice Johnson",
    username: "alicej",
    email: "alice@example.com",
    bio: "Frontend dev & coffee addict ☕",
  },
  {
    name: "Bob Smith",
    username: "bobsmith",
    email: "bob@example.com",
    bio: null,
  },
  {
    name: "Carol White",
    username: "carolw",
    email: "carol@example.com",
    bio: "Designer. Dog lover. Dark mode only.",
  },
  {
    name: "David Lee",
    username: "davidlee",
    email: "david@example.com",
    bio: "Full-stack engineer. TypeScript or nothing.",
  },
  {
    name: "Emma Brown",
    username: "emmab",
    email: "emma@example.com",
    bio: "Open source contributor & cat enthusiast 🐱",
  },
  {
    name: "Frank Garcia",
    username: "frankg",
    email: "frank@example.com",
    bio: null,
  },
  {
    name: "Grace Kim",
    username: "gracek",
    email: "grace@example.com",
    bio: "React & accessibility advocate",
  },
  {
    name: "Henry Wilson",
    username: "henryw",
    email: "henry@example.com",
    bio: "Backend engineer. Postgres fanboy.",
  },
  {
    name: "Isabel Martinez",
    username: "isabelm",
    email: "isabel@example.com",
    bio: "DevOps & cloud infrastructure ☁️",
  },
];

const TWEETS: string[][] = [
  // facu2410
  [
    "Just shipped my Twitter clone built with Next.js, Prisma and Tailwind. Feels good 🚀",
    "TypeScript really does make everything better. No cap.",
    "Dark mode is not optional. It's a lifestyle.",
  ],
  // alicej
  [
    "CSS Flexbox changed my life and I will die on this hill.",
    "Hot take: pair programming beats solo debugging every single time.",
    "Today I learned you can chain optional chaining operators. My brain is melting.",
  ],
  // bobsmith
  [
    "Spent 3 hours debugging. The problem was a missing semicolon. I quit.",
    "Coffee → Code → Sleep → Repeat",
    "Why write comments when you can write clean code that explains itself?",
  ],
  // carolw
  [
    "Good design is invisible. Bad design is all you can see.",
    "Spacing and typography are doing 80% of the work in any UI.",
    "Always prototype before you build. Seriously. Always.",
  ],
  // davidlee
  [
    "Prisma 7 + Next.js App Router is genuinely the best DX I've had in years.",
    "Server Components changed how I think about data fetching. Never going back.",
    "Zod for everything. Validate at the boundary, trust in the middle.",
  ],
  // emmab
  [
    "Opened a PR today with 500 lines of tests and 50 lines of code. Peak engineering.",
    "Every time you skip writing tests, a puppy cries. Don't make puppies cry.",
    "The best code I've ever written was code I deleted.",
  ],
  // frankg
  [
    "git commit -m 'fix' for the 14th time today",
    "I don't always test my code, but when I do, I do it in production.",
    "Stack Overflow is down. I am effectively useless.",
  ],
  // gracek
  [
    "Accessibility is not a feature, it's a requirement.",
    "If your app isn't usable with a keyboard, it's broken. Full stop.",
    "useReducer is just useState for people who like to feel smart.",
  ],
  // henryw
  [
    "Indexes. Use them. Your future self will thank you.",
    "Cursor-based pagination is always the right answer.",
    "SQL is not scary. SQL is your friend. Learn SQL.",
  ],
  // isabelm
  [
    "Containers are great until you spend 2 days debugging a volume mount.",
    "Infrastructure as code is the only sane way to manage infra. Change my mind.",
    "If it's not in a pipeline, it doesn't exist.",
  ],
];

async function main() {
  console.log("🌱 Seeding database...");

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // Clean existing seeded users (cascade deletes their tweets)
  const emails = USERS.map((u) => u.email);
  await prisma.user.deleteMany({ where: { email: { in: emails } } });

  for (let i = 0; i < USERS.length; i++) {
    const userData = USERS[i];
    const tweets = TWEETS[i];

    const user = await prisma.user.create({
      data: { ...userData, passwordHash },
    });

    await prisma.tweet.createMany({
      data: tweets.map((content) => ({ content, authorId: user.id })),
    });

    console.log(`  ✓ ${user.name} (@${user.username}) — ${tweets.length} tweets`);
  }

  console.log(`\n✅ Seeded ${USERS.length} users with ${USERS.length * 3} tweets.`);
  console.log(`   Password for all accounts: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
