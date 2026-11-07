import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NEO4J_URI: z.string().url(),
  NEO4J_USERNAME: z.string().min(1),
  NEO4J_PASSWORD: z.string().min(1),
  PORT: z.coerce.number().default(3000),
});

export const env = envSchema.parse(process.env);