import { z } from "zod";

export const tweetSchema = z.object({
  content: z.string().trim().max(280, "Tweet is too long"),
  attachmentUrl: z.string().optional().nullable(),
}).refine((d) => d.content.length > 0 || !!d.attachmentUrl, { message: "Tweet cannot be empty" });

export type TweetInput = z.infer<typeof tweetSchema>;
