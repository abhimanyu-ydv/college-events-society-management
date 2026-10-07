import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";

function isAllowedEmail(email: string) {
  const allowed = process.env.ALLOWED_EMAIL_DOMAIN?.split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

  if (!allowed || allowed.length === 0) return true;

  const domain = email.split("@")[1]?.toLowerCase();
  return !!domain && allowed.includes(domain);
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const { user } = data;
  const email = user.email ?? "";

  if (!isAllowedEmail(email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=domain`);
  }

  await db
    .insert(profiles)
    .values({
      id: user.id,
      email,
      fullName: user.user_metadata.full_name ?? user.user_metadata.name ?? email,
      avatarUrl: user.user_metadata.avatar_url ?? null,
    })
    .onConflictDoUpdate({
      target: profiles.id,
      set: {
        email,
        fullName: user.user_metadata.full_name ?? user.user_metadata.name ?? email,
        avatarUrl: user.user_metadata.avatar_url ?? null,
      },
    });

  return NextResponse.redirect(`${origin}/dashboard`);
}
