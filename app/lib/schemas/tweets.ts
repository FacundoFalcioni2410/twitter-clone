import { z } from "zod";

export const tweetSchema = z.object({
  content: z.string().trim().min(1, "Tweet cannot be empty").max(280, "Tweet is too long"),
});

export type TweetInput = z.infer<typeof tweetSchema>;
