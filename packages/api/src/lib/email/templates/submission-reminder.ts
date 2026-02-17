import { emailWrapper } from "./base";

export function submissionReminderEmail(params: {
  leagueName: string;
  themeName: string;
  deadline: string;
}): { subject: string; html: string } {
  return {
    subject: `Reminder: Submit for "${params.themeName}" - ${params.leagueName}`,
    html: emailWrapper(`
      <h1 style="color:#50C878;font-size:20px;margin:0 0 16px;">Submission Reminder</h1>
      <p style="color:#DCE4E4;font-size:15px;margin:0 0 8px;">
        Don't forget to submit your track for <strong>${params.leagueName}</strong>!
      </p>
      <div style="background-color:#0A1A1A;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="color:#50C878;font-size:16px;font-weight:600;margin:0 0 4px;">${params.themeName}</p>
        <p style="color:#8FA8A8;font-size:13px;margin:0;">Deadline: ${params.deadline}</p>
      </div>
      <p style="color:#8FA8A8;font-size:13px;margin:0;">Submit your track before time runs out.</p>
    `),
  };
}
