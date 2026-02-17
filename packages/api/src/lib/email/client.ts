import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;

const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!resend) return;

  await resend.emails.send({
    from: "Tokilist <onboarding@resend.dev>",
    to,
    subject,
    html,
  });
}
