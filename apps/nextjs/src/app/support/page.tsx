import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support - Tokilist",
  description:
    "Get help with Tokilist. Find answers to frequently asked questions or contact our support team.",
};

export default function SupportPage() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center px-6 py-12">
      <div className="glass-panel relative mx-auto w-full max-w-3xl overflow-hidden rounded-3xl p-8">
        {/* Aurora effect */}
        <div className="pointer-events-none absolute top-0 left-0 h-full w-full rounded-3xl">
          <div className="bg-primary/10 absolute top-[-50%] left-[-20%] h-[80%] w-[80%] rounded-full mix-blend-screen blur-[100px]"></div>
          <div className="bg-primary/10 absolute right-[-10%] bottom-[-20%] h-[60%] w-[60%] rounded-full mix-blend-screen blur-[80px]"></div>
        </div>

        <div className="relative z-10">
          <Link
            href="/"
            className="text-muted-foreground hover:text-primary mb-8 inline-block text-sm transition-colors"
          >
            &larr; Back to Tokilist
          </Link>

          <article className="prose prose-invert max-w-none">
            <h1 className="mb-2 text-4xl font-bold text-white">Support</h1>
            <p className="text-foreground mb-10">
              Need help with Tokilist? We are here to help.
            </p>

            <Section title="Contact Us">
              <p>For any questions, issues, or feedback, reach out to us at:</p>
              <p>
                <a
                  href="mailto:support@calayo.net"
                  className="text-primary hover:text-primary-hover underline transition-colors"
                >
                  support@calayo.net
                </a>
              </p>
            </Section>

            <Section title="Frequently Asked Questions">
              <FAQ question="How do I create a task?">
                <p>
                  Tap the green <strong>+</strong> button at the bottom right.
                </p>
              </FAQ>

              <FAQ question="How do swipe gestures work?">
                <p>
                  In <strong>card view</strong>: swipe up to complete, down to
                  mark for delete.
                </p>
                <p>
                  In <strong>list view</strong>: swipe left to complete, right
                  to mark for delete.
                </p>
                <p>Double-tap to edit.</p>
              </FAQ>

              <FAQ question="How do I share a list?">
                <p>
                  Go to your lists, open a list, and tap <strong>Invite</strong>{" "}
                  to generate a share link.
                </p>
              </FAQ>

              <FAQ question="How do I delete my account?">
                <p>
                  Go to <strong>Profile</strong> &gt;{" "}
                  <strong>Danger Zone</strong> &gt;{" "}
                  <strong>Delete Account</strong>.
                </p>
              </FAQ>

              <FAQ question="How do I report or block a user?">
                <p>
                  On a shared list, tap the <strong>...</strong> icon next to a
                  member name.
                </p>
              </FAQ>
            </Section>

            <Section title="Links">
              <ul>
                <li>
                  <Link
                    href="/privacy"
                    className="text-primary hover:text-primary-hover underline transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="text-primary hover:text-primary-hover underline transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </Section>
          </article>
        </div>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-2xl font-bold text-white">{title}</h2>
      <div className="text-foreground [&_li]:text-foreground [&_p]:text-foreground space-y-3 [&_strong]:text-white [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6">
        {children}
      </div>
    </section>
  );
}

function FAQ({
  question,
  children,
}: {
  question: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <h3 className="text-foreground text-lg font-semibold">{question}</h3>
      {children}
    </div>
  );
}
