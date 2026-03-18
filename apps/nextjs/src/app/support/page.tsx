import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support - Tokilist",
  description:
    "Get help with Tokilist. Find answers to frequently asked questions or contact our support team.",
};

export default function SupportPage() {
  return (
    <main className="flex min-h-screen flex-col bg-[#0A1A1A]">
      <div className="mx-auto w-full max-w-3xl px-6 py-12">
        <Link
          href="/"
          className="mb-8 inline-block text-sm text-[#8FA8A8] transition-colors hover:text-[#50C878]"
        >
          &larr; Back to Tokilist
        </Link>

        <article className="prose prose-invert max-w-none">
          <h1 className="mb-2 text-4xl font-bold text-white">Support</h1>
          <p className="mb-10 text-[#DCE4E4]">
            Need help with Tokilist? We are here to help.
          </p>

          <Section title="Contact Us">
            <p>
              For any questions, issues, or feedback, reach out to us at:
            </p>
            <p>
              <a
                href="mailto:support@calayo.net"
                className="text-[#50C878] underline transition-colors hover:text-[#66D99A]"
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
                In <strong>list view</strong>: swipe left to complete, right to
                mark for delete.
              </p>
              <p>Double-tap to edit.</p>
            </FAQ>

            <FAQ question="How do I share a list?">
              <p>
                Go to your lists, open a list, and tap{" "}
                <strong>Invite</strong> to generate a share link.
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
                  className="text-[#50C878] underline transition-colors hover:text-[#66D99A]"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-[#50C878] underline transition-colors hover:text-[#66D99A]"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </Section>
        </article>
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
      <div className="space-y-3 text-[#DCE4E4] [&_li]:text-[#DCE4E4] [&_p]:text-[#DCE4E4] [&_strong]:text-white [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6">
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
      <h3 className="text-lg font-semibold text-[#DCE4E4]">{question}</h3>
      {children}
    </div>
  );
}
