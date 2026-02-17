import { emailWrapper } from "./base";

export function roundStartedEmail(params: {
  leagueName: string;
  themeName: string;
  deadline: string;
}): { subject: string; html: string } {
  return {
    subject: `New Round: ${params.themeName} - ${params.leagueName}`,
    html: emailWrapper(`
      <h1 style="color:#50C878;font-size:20px;margin:0 0 16px;">New Round Started</h1>
      <p style="color:#DCE4E4;font-size:15px;margin:0 0 8px;">
        <strong>${params.leagueName}</strong> has a new round!
      </p>
      <div style="background-color:#0A1A1A;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="color:#50C878;font-size:16px;font-weight:600;margin:0 0 4px;">${params.themeName}</p>
        <p style="color:#8FA8A8;font-size:13px;margin:0;">Submit by ${params.deadline}</p>
      </div>
      <p style="color:#8FA8A8;font-size:13px;margin:0;">Head to Tokilist to submit your track.</p>
    `),
  };
}
