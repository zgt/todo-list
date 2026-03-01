"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submissionReminderEmail = submissionReminderEmail;
var base_1 = require("./base");
function submissionReminderEmail(params) {
    return {
        subject: "Reminder: Submit for \"".concat(params.themeName, "\" - ").concat(params.leagueName),
        html: (0, base_1.emailWrapper)("\n      <h1 style=\"color:#50C878;font-size:20px;margin:0 0 16px;\">Submission Reminder</h1>\n      <p style=\"color:#DCE4E4;font-size:15px;margin:0 0 8px;\">\n        Don't forget to submit your track for <strong>".concat(params.leagueName, "</strong>!\n      </p>\n      <div style=\"background-color:#0A1A1A;border-radius:8px;padding:16px;margin:16px 0;\">\n        <p style=\"color:#50C878;font-size:16px;font-weight:600;margin:0 0 4px;\">").concat(params.themeName, "</p>\n        <p style=\"color:#8FA8A8;font-size:13px;margin:0;\">Deadline: ").concat(params.deadline, "</p>\n      </div>\n      <p style=\"color:#8FA8A8;font-size:13px;margin:0;\">Submit your track before time runs out.</p>\n    ")),
    };
}
