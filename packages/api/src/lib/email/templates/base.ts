export function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#0A1A1A;font-family:sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="background-color:#102A2A;border-radius:12px;border:1px solid #164B49;padding:32px;">
      ${content}
    </div>
    <p style="color:#8FA8A8;font-size:12px;text-align:center;margin-top:24px;">
      Tokilist
    </p>
  </div>
</body>
</html>`;
}
