import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service - Tokilist",
  description: "Terms of Service for the Tokilist application",
};

export default function TermsOfServicePage() {
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
              Terms of Service
            </h1>
            <p className="mb-10 text-sm text-[#8FA8A8]">
              Last updated: March 5, 2026
            </p>

            <Section title="1. Acceptance of Terms">
              <p>
                By accessing or using the Tokilist mobile application and web
                application (collectively, the &quot;Service&quot;), you agree to
                be bound by these Terms of Service (&quot;Terms&quot;). If you do
                not agree to these Terms, you may not use the Service.
              </p>
              <p>
                The Service is operated by Calayo (&quot;we&quot;,
                &quot;our&quot;, or &quot;us&quot;).
              </p>
            </Section>

            <Section title="2. Eligibility">
              <p>
                You must be at least 13 years of age to use the Service. By using
                the Service, you represent and warrant that you meet this age
                requirement.
              </p>
            </Section>

            <Section title="3. Account Registration">
              <p>
                To use certain features of the Service, you must create an account
                by signing in through a supported third-party authentication
                provider (Discord or Google). You are responsible for:
              </p>
              <ul>
                <li>Maintaining the security of your account credentials</li>
                <li>All activity that occurs under your account</li>
                <li>
                  Notifying us immediately of any unauthorized use of your account
                </li>
              </ul>
              <p>
                We reserve the right to suspend or terminate accounts that violate
                these Terms.
              </p>
            </Section>

            <Section title="4. Acceptable Use">
              <p>You agree not to use the Service to:</p>
              <ul>
                <li>
                  Violate any applicable law, regulation, or third-party rights
                </li>
                <li>
                  Upload or share content that is illegal, harmful, threatening,
                  abusive, harassing, defamatory, or otherwise objectionable
                </li>
                <li>
                  Interfere with or disrupt the Service or its infrastructure
                </li>
                <li>
                  Attempt to gain unauthorized access to any part of the Service
                  or its systems
                </li>
                <li>
                  Use automated means (bots, scrapers, etc.) to access the Service
                  without our express written permission
                </li>
                <li>Impersonate any person or entity</li>
              </ul>
            </Section>

            <Section title="5. User Content">
              <p>
                You retain ownership of all content you create through the
                Service, including tasks, lists, and categories (&quot;User
                Content&quot;). By using the Service, you grant us a limited,
                non-exclusive license to store, process, and display your User
                Content solely for the purpose of providing the Service to you.
              </p>
              <p>
                You are solely responsible for your User Content. We do not
                monitor or endorse User Content and are not liable for any content
                created by users.
              </p>
            </Section>

            <Section title="6. Shared Lists & Collaboration">
              <p>
                The Service allows you to share lists and collaborate with other
                users. When you share a list:
              </p>
              <ul>
                <li>
                  Other members of the shared list can view, edit, and delete
                  tasks within that list
                </li>
                <li>You can remove members or leave a shared list at any time</li>
                <li>
                  The list owner may delete the list, which will remove it for all
                  members
                </li>
              </ul>
              <p>
                You are responsible for managing access to your shared lists and
                the content shared within them.
              </p>
            </Section>

            <Section title="7. Push Notifications">
              <p>
                The Service may send you push notifications for task reminders and
                due dates. You can manage your notification preferences within the
                app or through your device settings at any time.
              </p>
            </Section>

            <Section title="8. Intellectual Property">
              <p>
                The Service, including its design, features, code, and branding,
                is owned by Calayo and protected by applicable intellectual
                property laws. These Terms do not grant you any right to use our
                trademarks, logos, or branding without our prior written consent.
              </p>
            </Section>

            <Section title="9. Disclaimers">
              <p>
                The Service is provided on an &quot;as is&quot; and &quot;as
                available&quot; basis, without warranties of any kind, either
                express or implied. We do not warrant that the Service will be
                uninterrupted, error-free, or free of harmful components.
              </p>
              <p>
                To the fullest extent permitted by law, we disclaim all
                warranties, including implied warranties of merchantability,
                fitness for a particular purpose, and non-infringement.
              </p>
            </Section>

            <Section title="10. Limitation of Liability">
              <p>
                To the maximum extent permitted by applicable law, Calayo and its
                officers, employees, and affiliates shall not be liable for any
                indirect, incidental, special, consequential, or punitive damages,
                or any loss of data, profits, or goodwill, arising out of or
                related to your use of the Service.
              </p>
              <p>
                Our total liability for any claim arising from or related to the
                Service shall not exceed the amount you paid us (if any) in the
                twelve (12) months preceding the claim.
              </p>
            </Section>

            <Section title="11. Account Termination">
              <p>
                You may delete your account at any time through the app. Upon
                deletion, your data will be permanently removed in accordance with
                our{" "}
                <Link
                  href="/privacy"
                  className="text-[#50C878] underline transition-colors hover:text-[#66D99A]"
                >
                  Privacy Policy
                </Link>
                .
              </p>
              <p>
                We reserve the right to suspend or terminate your account if you
                violate these Terms, with or without notice.
              </p>
            </Section>

            <Section title="12. Changes to These Terms">
              <p>
                We may update these Terms from time to time. We will notify you of
                significant changes by posting the updated Terms within the app.
                Your continued use of the Service after changes are posted
                constitutes your acceptance of the revised Terms.
              </p>
              <p>
                The &quot;Last updated&quot; date at the top reflects the most
                recent revision.
              </p>
            </Section>

            <Section title="13. Governing Law">
              <p>
                These Terms shall be governed by and construed in accordance with
                the laws of the United States, without regard to conflict of law
                principles.
              </p>
            </Section>

            <Section title="14. Contact Us">
              <p>
                If you have questions about these Terms of Service, please contact
                us at:
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
