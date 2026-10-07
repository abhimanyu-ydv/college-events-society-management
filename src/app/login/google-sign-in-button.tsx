"use client";

import { createClient } from "@/lib/supabase/client";

export function GoogleSignInButton() {
  async function signInWithGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <button
      onClick={signInWithGoogle}
      className="w-full rounded-md border border-foreground/20 px-4 py-2 text-sm font-medium transition hover:bg-foreground/5"
    >
      Sign in with Google
    </button>
  );
}
