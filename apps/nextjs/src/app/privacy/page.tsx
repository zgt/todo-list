import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy - Tokilist",
  description: "Privacy Policy for the Tokilist application",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="glass-panel relative w-full max-w-3xl overflow-hidden rounded-3xl p-8">
        {/* Aurora effect */}
        <div className="pointer-events-none absolute top-0 left-0 h-full w-full rounded-3xl">
          <div className="bg-primary/10 absolute top-[-50%] left-[-20%] h-[80%] w-[80%] rounded-full mix-blend-screen blur-[100px]"></div>
          <div className="absolute right-[-10%] bottom-[-20%] h-[60%] w-[60%] rounded-full bg-emerald-600/10 mix-blend-screen blur-[80px]"></div>
        </div>

        <div className="relative z-10">
          <Link
            href="/"
            className="mb-8 inline-block text-sm text-[#8FA8A8] transition-colors hover:text-[#50C878]"
          >
            &larr; Back to Tokilist
          </Link>

          <article className="prose prose-invert max-w-none">
            <h1 className="mb-2 text-4xl font-bold text-white">
              Privacy Policy
            </h1>
            <p className="mb-10 text-sm text-[#8FA8A8]">
              Last updated: March 1, 2026
            </p>

            <Section title="1. Introduction">
              <p>
                Welcome to Tokilist (&quot;we&quot;, &quot;our&quot;, or
                &quot;us&quot;). This Privacy Policy explains how we collect, use,
                and protect your personal information when you use the Tokilist
                mobile application and web application (collectively, the
                &quot;Service&quot;).
              </p>
              <p>
                By using Tokilist, you agree to the collection and use of
                information in accordance with this policy.
              </p>
            </Section>

            <Section title="2. Information We Collect">
              <h3 className="text-lg font-semibold text-[#DCE4E4]">
                Account Information
              </h3>
              <p>
                When you sign in using a third-party OAuth provider (Discord or
                Google), we receive and store:
              </p>
              <ul>
                <li>Your name</li>
                <li>Your email address</li>
                <li>Your profile picture</li>
              </ul>

              <h3 className="text-lg font-semibold text-[#DCE4E4]">
                User-Generated Content
              </h3>
              <p>We store data you create while using the Service, including:</p>
              <ul>
                <li>Tasks and task lists</li>
                <li>Categories</li>
                <li>Shared list memberships</li>
              </ul>

              <h3 className="text-lg font-semibold text-[#DCE4E4]">
                Device &amp; Technical Information
              </h3>
              <ul>
                <li>
                  Push notification tokens (used solely to deliver notifications
                  you have opted into)
                </li>
                <li>
                  Notification preferences (email, push, and reminder settings)
                </li>
              </ul>
            </Section>

            <Section title="3. How We Use Your Information">
              <p>We use the information we collect to:</p>
              <ul>
                <li>Provide, maintain, and improve the Service</li>
                <li>Authenticate your identity and manage your account</li>
                <li>
                  Send push notifications and email reminders you have opted into
                </li>
                <li>Enable shared lists and collaborative features</li>
              </ul>
              <p>
                We do <strong>not</strong> sell, rent, or share your personal
                information with third parties for marketing purposes.
              </p>
            </Section>

            <Section title="4. Third-Party Services">
              <p>Tokilist integrates with the following third-party services:</p>
              <ul>
                <li>
                  <strong>Discord OAuth</strong> &mdash; for account
                  authentication
                </li>
                <li>
                  <strong>Google OAuth</strong> &mdash; for account authentication
                </li>
                <li>
                  <strong>Expo Push Notification Service</strong> &mdash; for
                  delivering push notifications to your device
                </li>
              </ul>
              <p>
                Each of these services has its own privacy policy. We encourage
                you to review them. We only share the minimum data necessary for
                these integrations to function.
              </p>
            </Section>

            <Section title="5. Data Storage & Security">
              <p>
                Your data is stored securely using industry-standard cloud
                infrastructure. We use encrypted connections (HTTPS/TLS) for all
                data transmission between your device and our servers.
              </p>
              <p>
                While we implement reasonable security measures, no method of
                electronic storage or transmission is 100% secure. We cannot
                guarantee absolute security of your data.
              </p>
            </Section>

            <Section title="6. Data Retention & Deletion">
              <p>
                We retain your data for as long as your account is active. You may
                delete your account at any time, which will permanently remove:
              </p>
              <ul>
                <li>Your profile information</li>
                <li>Your tasks and task lists</li>
                <li>Your notification preferences and push tokens</li>
              </ul>
              <p>
                Account deletion is irreversible. Some data may be retained in
                encrypted backups for a limited period before being permanently
                purged.
              </p>
            </Section>

            <Section title="7. Children's Privacy">
              <p>
                Tokilist is not intended for children under 13. We do not
                knowingly collect personal information from children under 13. If
                we discover that we have collected such data, we will delete it
                promptly.
              </p>
            </Section>

            <Section title="8. Changes to This Policy">
              <p>
                We may update this Privacy Policy from time to time. We will
                notify you of significant changes by posting the updated policy
                within the app. The &quot;Last updated&quot; date at the top
                reflects the most recent revision.
              </p>
            </Section>

            <Section title="9. Contact Us">
              <p>
                If you have questions or concerns about this Privacy Policy or
                your data, please contact us at:
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
      <div className="space-y-3 text-[#DCE4E4] [&_li]:text-[#DCE4E4] [&_p]:text-[#DCE4E4] [&_strong]:text-white [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6">
        {children}
      </div>
    </section>
  );
}
