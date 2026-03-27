import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(50),
  bio: z.string().max(160).optional(),
  avatarUrl: z.string().optional().nullable(),
  headerUrl: z.string().optional().nullable(),
});
