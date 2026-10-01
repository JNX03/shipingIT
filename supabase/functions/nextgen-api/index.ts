// This file runs in Supabase's Deno runtime, never inside the Expo application.
import { createSupabaseEdgeHandler } from '../../../src/server/edge-adapter.mjs';

declare const Deno: {
  env: { toObject(): Record<string, string> };
  serve(handler: (request: Request) => Promise<Response>): unknown;
};

Deno.serve(createSupabaseEdgeHandler({ env: Deno.env.toObject() }));
