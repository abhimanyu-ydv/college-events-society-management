import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client for privileged, server-only operations (e.g. Storage
// uploads not tied to the current user's session). Never import this from
// client code or expose SUPABASE_SERVICE_ROLE_KEY to the browser.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
