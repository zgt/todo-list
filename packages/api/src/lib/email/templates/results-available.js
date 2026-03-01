"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resultsAvailableEmail = resultsAvailableEmail;
var base_1 = require("./base");
function resultsAvailableEmail(params) {
    return {
        subject: "Results: ".concat(params.themeName, " - ").concat(params.leagueName),
        html: (0, base_1.emailWrapper)("\n      <h1 style=\"color:#50C878;font-size:20px;margin:0 0 16px;\">Results Are In!</h1>\n      <p style=\"color:#DCE4E4;font-size:15px;margin:0 0 8px;\">\n        The results for <strong>".concat(params.leagueName, "</strong> are ready!\n      </p>\n      <div style=\"background-color:#0A1A1A;border-radius:8px;padding:16px;margin:16px 0;\">\n        <p style=\"color:#50C878;font-size:16px;font-weight:600;margin:0;\">").concat(params.themeName, "</p>\n      </div>\n      <p style=\"color:#8FA8A8;font-size:13px;margin:0;\">Check out who won this round.</p>\n    ")),
    };
}
