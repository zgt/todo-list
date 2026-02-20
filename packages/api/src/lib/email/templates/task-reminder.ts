import { emailWrapper } from "./base";

export function taskReminderEmail(params: {
  taskTitle: string;
  taskDescription?: string | null;
  dueDate?: string | null;
  appUrl: string;
}): { subject: string; html: string } {
  const descriptionBlock = params.taskDescription
    ? `<p style="color:#8FA8A8;font-size:14px;margin:8px 0 0;">${params.taskDescription}</p>`
    : "";

  const dueDateBlock = params.dueDate
    ? `<p style="color:#8FA8A8;font-size:13px;margin:4px 0 0;">Due: ${params.dueDate}</p>`
    : "";

  return {
    subject: `⏰ Reminder: ${params.taskTitle}`,
    html: emailWrapper(`
      <h1 style="color:#50C878;font-size:20px;margin:0 0 16px;">Task Reminder</h1>
      <div style="background-color:#0A1A1A;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="color:#DCE4E4;font-size:16px;font-weight:600;margin:0;">${params.taskTitle}</p>
        ${descriptionBlock}
        ${dueDateBlock}
      </div>
      <a href="${params.appUrl}" style="display:inline-block;background-color:#50C878;color:#0A1A1A;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;margin-top:8px;">
        Open Tokilist
      </a>
    `),
  };
}
