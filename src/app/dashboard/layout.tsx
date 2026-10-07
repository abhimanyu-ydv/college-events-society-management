import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { SignOutButton } from "./sign-out-button";

// Every /dashboard route is per-user and auth-gated, so none of it can be
// part of the static shell — opt the whole subtree out of Cache Components'
// instant-navigation validation rather than restructuring each page with
// Suspense boundaries this early. See authentication-with-cache-components.md.
export const instant = false;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAuth();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-foreground/10 px-6 py-4">
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="font-semibold">
            Dashboard
          </Link>
          <Link href="/dashboard/societies" className="text-foreground/70 hover:text-foreground">
            Societies
          </Link>
          <Link href="/dashboard/events" className="text-foreground/70 hover:text-foreground">
            Events
          </Link>
          <Link href="/dashboard/registrations" className="text-foreground/70 hover:text-foreground">
            My registrations
          </Link>
          {profile.isAdmin && (
            <Link href="/dashboard/admin" className="text-foreground/70 hover:text-foreground">
              Admin
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-foreground/70">{profile.fullName}</span>
          <SignOutButton />
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
