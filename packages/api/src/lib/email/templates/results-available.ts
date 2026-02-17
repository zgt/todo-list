import { emailWrapper } from "./base";

export function resultsAvailableEmail(params: {
  leagueName: string;
  themeName: string;
}): { subject: string; html: string } {
  return {
    subject: `Results: ${params.themeName} - ${params.leagueName}`,
    html: emailWrapper(`
      <h1 style="color:#50C878;font-size:20px;margin:0 0 16px;">Results Are In!</h1>
      <p style="color:#DCE4E4;font-size:15px;margin:0 0 8px;">
        The results for <strong>${params.leagueName}</strong> are ready!
      </p>
      <div style="background-color:#0A1A1A;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="color:#50C878;font-size:16px;font-weight:600;margin:0;">${params.themeName}</p>
      </div>
      <p style="color:#8FA8A8;font-size:13px;margin:0;">Check out who won this round.</p>
    `),
  };
}
