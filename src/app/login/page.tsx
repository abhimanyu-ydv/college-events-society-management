import { Suspense } from "react";
import { GoogleSignInButton } from "./google-sign-in-button";

const ERROR_MESSAGES: Record<string, string> = {
  domain: "Please sign in with your university email address.",
  auth: "Something went wrong while signing you in. Please try again.",
};

async function LoginError({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  if (!error) return null;

  return (
    <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
      {ERROR_MESSAGES[error] ?? "Unable to sign in. Please try again."}
    </p>
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-foreground/70">
            Use your university Google account to continue.
          </p>
        </div>

        <Suspense fallback={null}>
          <LoginError searchParams={searchParams} />
        </Suspense>

        <GoogleSignInButton />
      </div>
    </main>
  );
}
