import Link from "next/link";

/**
 * Branded landing page for Better Auth API errors.
 *
 * Better Auth's `onAPIError.errorURL` points here and appends the failure as a
 * `?error=<code>` query param (e.g. `state_mismatch`). We map known codes to
 * calm, user-friendly copy and fall back to a generic message for anything
 * unrecognised. The raw code is never used as the headline — it only appears as
 * a small muted technical detail to aid support.
 */

interface ErrorCopy {
  title: string;
  description: string;
}

const GENERIC: ErrorCopy = {
  title: "We couldn't sign you in",
  description:
    "Something went wrong while signing you in. Please try again from the home page.",
};

// Maps Better Auth OAuth error codes to friendly copy. Codes with the same
// meaning share an entry.
const ERROR_COPY: Record<string, ErrorCopy> = {
  state_mismatch: {
    title: "Your sign-in session expired",
    description: "Your sign-in session expired. Please try signing in again.",
  },
  state_security_mismatch: {
    title: "Your sign-in session expired",
    description: "Your sign-in session expired. Please try signing in again.",
  },
  please_restart_the_process: {
    title: "Let's try that again",
    description:
      "Your sign-in couldn't be completed. Please start signing in again.",
  },
  invalid_callback_request: {
    title: "Let's try that again",
    description:
      "Your sign-in couldn't be completed. Please start signing in again.",
  },
  access_denied: {
    title: "Sign-in was cancelled",
    description:
      "You cancelled the sign-in, or it wasn't approved. You can try again whenever you're ready.",
  },
  banned: {
    title: "This account is unavailable",
    description:
      "This account can't be used to sign in. If you think this is a mistake, please contact support.",
  },
  email_not_found: {
    title: "We couldn't finish signing you in",
    description:
      "We couldn't read the details needed from your provider. Please try again, or use a different sign-in method.",
  },
  email_is_missing: {
    title: "We couldn't finish signing you in",
    description:
      "We couldn't read the details needed from your provider. Please try again, or use a different sign-in method.",
  },
  user_info_is_missing: {
    title: "We couldn't finish signing you in",
    description:
      "We couldn't read the details needed from your provider. Please try again, or use a different sign-in method.",
  },
  account_already_linked_to_different_user: {
    title: "This account is already linked",
    description:
      "This login is already connected to a different account. Please sign in with the method you used originally.",
  },
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawCode = params.error;
  const code = Array.isArray(rawCode) ? rawCode[0] : rawCode;

  const copy = (code ? ERROR_COPY[code] : undefined) ?? GENERIC;

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6">
      <div className="border-border-strong bg-surface-2/80 w-full max-w-md rounded-2xl border p-10 text-center backdrop-blur-sm">
        <p className="text-primary mb-2 text-sm font-semibold tracking-widest">
          SIGN-IN ERROR
        </p>
        <h1 className="mb-3 text-2xl font-bold text-white">{copy.title}</h1>
        <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
          {copy.description}
        </p>
        <Link
          href="/"
          className="bg-primary text-primary-foreground hover:bg-primary-hover inline-block rounded-md px-6 py-2.5 text-sm font-semibold transition-colors"
        >
          Back to sign in
        </Link>
        {code ? (
          <p className="text-muted-foreground/60 mt-6 text-xs">
            Reference: {code}
          </p>
        ) : null}
      </div>
    </div>
  );
}
