"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.votingOpenEmail = votingOpenEmail;
var base_1 = require("./base");
function votingOpenEmail(params) {
    return {
        subject: "Voting Open: ".concat(params.themeName, " - ").concat(params.leagueName),
        html: (0, base_1.emailWrapper)("\n      <h1 style=\"color:#50C878;font-size:20px;margin:0 0 16px;\">Voting Is Open</h1>\n      <p style=\"color:#DCE4E4;font-size:15px;margin:0 0 8px;\">\n        Time to vote in <strong>".concat(params.leagueName, "</strong>!\n      </p>\n      <div style=\"background-color:#0A1A1A;border-radius:8px;padding:16px;margin:16px 0;\">\n        <p style=\"color:#50C878;font-size:16px;font-weight:600;margin:0 0 4px;\">").concat(params.themeName, "</p>\n        <p style=\"color:#8FA8A8;font-size:13px;margin:0;\">Vote by ").concat(params.deadline, "</p>\n      </div>\n      <p style=\"color:#8FA8A8;font-size:13px;margin:0;\">Listen to the submissions and cast your votes.</p>\n    ")),
    };
}
