import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="max-w-xl space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">
          Centralised College Events &amp; Society Management
        </h1>
        <p className="text-foreground/70">
          Discover events, manage societies, and track participation — all in one place.
        </p>
      </div>
      <Link
        href="/login"
        className="rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
      >
        Sign in to get started
      </Link>
    </main>
  );
}
