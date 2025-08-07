import { z } from 'zod';

/**
 * Returns and validates the Supabase client keys from the environment.
 */
export function getSupabaseClientKeys() {
  return z
    .object({
      url: z.string({
        description: `This is the URL of your hosted Supabase instance. Please provide the variable NEXT_PUBLIC_SUPABASE_URL.`,
        required_error: `Please provide the variable NEXT_PUBLIC_SUPABASE_URL`,
      }),
      anonKey: z
        .string({
          description: `This is the anon key provided by Supabase. It is a public key used client-side. Please provide the variable NEXT_PUBLIC_SUPABASE_ANON_KEY.`,
          required_error: `Please provide the variable NEXT_PUBLIC_SUPABASE_ANON_KEY`,
        })
        .min(1),
    })
    .parse({
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });
}
