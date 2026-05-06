import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email({ message: "Enter a valid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
});

export type LoginInput = z.infer<typeof loginSchema>;
