import { z } from "zod";

const EnvSchema = z.object({
  PARALLEL_API_KEY: z.string().min(1, "Missing PARALLEL_API_KEY"),
  REDIS_URL: z.string().optional(),
  WEB_ORIGIN: z.string().min(1, "Missing WEB_ORIGIN"),
  PORT: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function getEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment: ${messages}`);
  }
  return parsed.data;
}
