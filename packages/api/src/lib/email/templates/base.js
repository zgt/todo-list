"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailWrapper = emailWrapper;
function emailWrapper(content) {
    return "<!DOCTYPE html>\n<html>\n<head><meta charset=\"utf-8\"></head>\n<body style=\"margin:0;padding:0;background-color:#0A1A1A;font-family:sans-serif;\">\n  <div style=\"max-width:560px;margin:0 auto;padding:32px 24px;\">\n    <div style=\"background-color:#102A2A;border-radius:12px;border:1px solid #164B49;padding:32px;\">\n      ".concat(content, "\n    </div>\n    <p style=\"color:#8FA8A8;font-size:12px;text-align:center;margin-top:24px;\">\n      Tokilist Music Leagues\n    </p>\n  </div>\n</body>\n</html>");
}
