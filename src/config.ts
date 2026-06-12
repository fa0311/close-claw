import { z } from "zod";

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  ADMIN_USER_ID: z.string().min(1),
});

export const config = envSchema.parse(process.env);
