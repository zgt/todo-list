"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __generator =
  (this && this.__generator) ||
  function (thisArg, body) {
    var _ = {
        label: 0,
        sent: function () {
          if (t[0] & 1) throw t[1];
          return t[1];
        },
        trys: [],
        ops: [],
      },
      f,
      y,
      t,
      g = Object.create(
        (typeof Iterator === "function" ? Iterator : Object).prototype,
      );
    return (
      (g.next = verb(0)),
      (g["throw"] = verb(1)),
      (g["return"] = verb(2)),
      typeof Symbol === "function" &&
        (g[Symbol.iterator] = function () {
          return this;
        }),
      g
    );
    function verb(n) {
      return function (v) {
        return step([n, v]);
      };
    }
    function step(op) {
      if (f) throw new TypeError("Generator is already executing.");
      while ((g && ((g = 0), op[0] && (_ = 0)), _))
        try {
          if (
            ((f = 1),
            y &&
              (t =
                op[0] & 2
                  ? y["return"]
                  : op[0]
                    ? y["throw"] || ((t = y["return"]) && t.call(y), 0)
                    : y.next) &&
              !(t = t.call(y, op[1])).done)
          )
            return t;
          if (((y = 0), t)) op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return { value: op[1], done: false };
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (
                !((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
                (op[0] === 6 || op[0] === 2)
              ) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2]) _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyRoundStarted = notifyRoundStarted;
exports.notifyVotingOpen = notifyVotingOpen;
exports.notifyResultsAvailable = notifyResultsAvailable;
exports.sendSubmissionReminders = sendSubmissionReminders;
var db_1 = require("@acme/db");
var client_1 = require("@acme/db/client");
var schema_1 = require("@acme/db/schema");
var client_2 = require("./client");
var results_available_1 = require("./templates/results-available");
var round_started_1 = require("./templates/round-started");
var submission_reminder_1 = require("./templates/submission-reminder");
var voting_open_1 = require("./templates/voting-open");
function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
function getLeagueMembers(leagueId) {
  return __awaiter(this, void 0, void 0, function () {
    var members;
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          return [
            4 /*yield*/,
            client_1.db.query.LeagueMember.findMany({
              where: (0, db_1.eq)(schema_1.LeagueMember.leagueId, leagueId),
              with: { user: true },
            }),
          ];
        case 1:
          members = _a.sent();
          return [2 /*return*/, members];
      }
    });
  });
}
function notifyRoundStarted(roundId) {
  return __awaiter(this, void 0, void 0, function () {
    var round, members, _i, members_1, member, prefs, _a, subject, html;
    return __generator(this, function (_b) {
      switch (_b.label) {
        case 0:
          return [
            4 /*yield*/,
            client_1.db.query.Round.findFirst({
              where: (0, db_1.eq)(schema_1.Round.id, roundId),
              with: { league: true },
            }),
          ];
        case 1:
          round = _b.sent();
          if (!round) return [2 /*return*/];
          return [4 /*yield*/, getLeagueMembers(round.leagueId)];
        case 2:
          members = _b.sent();
          ((_i = 0), (members_1 = members));
          _b.label = 3;
        case 3:
          if (!(_i < members_1.length)) return [3 /*break*/, 6];
          member = members_1[_i];
          prefs = member.user.notificationPreferences;
          if (
            (prefs === null || prefs === void 0 ? void 0 : prefs.roundStart) ===
            false
          )
            return [3 /*break*/, 5];
          ((_a = (0, round_started_1.roundStartedEmail)({
            leagueName: round.league.name,
            themeName: round.themeName,
            deadline: formatDate(round.submissionDeadline),
          })),
            (subject = _a.subject),
            (html = _a.html));
          return [
            4 /*yield*/,
            (0, client_2.sendEmail)({
              to: member.user.email,
              subject: subject,
              html: html,
            }),
          ];
        case 4:
          _b.sent();
          _b.label = 5;
        case 5:
          _i++;
          return [3 /*break*/, 3];
        case 6:
          return [2 /*return*/];
      }
    });
  });
}
function notifyVotingOpen(roundId) {
  return __awaiter(this, void 0, void 0, function () {
    var round, members, _i, members_2, member, prefs, _a, subject, html;
    return __generator(this, function (_b) {
      switch (_b.label) {
        case 0:
          return [
            4 /*yield*/,
            client_1.db.query.Round.findFirst({
              where: (0, db_1.eq)(schema_1.Round.id, roundId),
              with: { league: true },
            }),
          ];
        case 1:
          round = _b.sent();
          if (!round) return [2 /*return*/];
          return [4 /*yield*/, getLeagueMembers(round.leagueId)];
        case 2:
          members = _b.sent();
          ((_i = 0), (members_2 = members));
          _b.label = 3;
        case 3:
          if (!(_i < members_2.length)) return [3 /*break*/, 6];
          member = members_2[_i];
          prefs = member.user.notificationPreferences;
          if (
            (prefs === null || prefs === void 0 ? void 0 : prefs.votingOpen) ===
            false
          )
            return [3 /*break*/, 5];
          ((_a = (0, voting_open_1.votingOpenEmail)({
            leagueName: round.league.name,
            themeName: round.themeName,
            deadline: formatDate(round.votingDeadline),
          })),
            (subject = _a.subject),
            (html = _a.html));
          return [
            4 /*yield*/,
            (0, client_2.sendEmail)({
              to: member.user.email,
              subject: subject,
              html: html,
            }),
          ];
        case 4:
          _b.sent();
          _b.label = 5;
        case 5:
          _i++;
          return [3 /*break*/, 3];
        case 6:
          return [2 /*return*/];
      }
    });
  });
}
function notifyResultsAvailable(roundId) {
  return __awaiter(this, void 0, void 0, function () {
    var round, members, _i, members_3, member, prefs, _a, subject, html;
    return __generator(this, function (_b) {
      switch (_b.label) {
        case 0:
          return [
            4 /*yield*/,
            client_1.db.query.Round.findFirst({
              where: (0, db_1.eq)(schema_1.Round.id, roundId),
              with: { league: true },
            }),
          ];
        case 1:
          round = _b.sent();
          if (!round) return [2 /*return*/];
          return [4 /*yield*/, getLeagueMembers(round.leagueId)];
        case 2:
          members = _b.sent();
          ((_i = 0), (members_3 = members));
          _b.label = 3;
        case 3:
          if (!(_i < members_3.length)) return [3 /*break*/, 6];
          member = members_3[_i];
          prefs = member.user.notificationPreferences;
          if (
            (prefs === null || prefs === void 0
              ? void 0
              : prefs.resultsAvailable) === false
          )
            return [3 /*break*/, 5];
          ((_a = (0, results_available_1.resultsAvailableEmail)({
            leagueName: round.league.name,
            themeName: round.themeName,
          })),
            (subject = _a.subject),
            (html = _a.html));
          return [
            4 /*yield*/,
            (0, client_2.sendEmail)({
              to: member.user.email,
              subject: subject,
              html: html,
            }),
          ];
        case 4:
          _b.sent();
          _b.label = 5;
        case 5:
          _i++;
          return [3 /*break*/, 3];
        case 6:
          return [2 /*return*/];
      }
    });
  });
}
function sendSubmissionReminders(roundId) {
  return __awaiter(this, void 0, void 0, function () {
    var round,
      members,
      submissions,
      submittedUserIds,
      _i,
      members_4,
      member,
      prefs,
      _a,
      subject,
      html;
    return __generator(this, function (_b) {
      switch (_b.label) {
        case 0:
          return [
            4 /*yield*/,
            client_1.db.query.Round.findFirst({
              where: (0, db_1.eq)(schema_1.Round.id, roundId),
              with: { league: true },
            }),
          ];
        case 1:
          round = _b.sent();
          if (!round) return [2 /*return*/];
          return [4 /*yield*/, getLeagueMembers(round.leagueId)];
        case 2:
          members = _b.sent();
          return [
            4 /*yield*/,
            client_1.db.query.Submission.findMany({
              where: (0, db_1.eq)(schema_1.Submission.roundId, roundId),
            }),
          ];
        case 3:
          submissions = _b.sent();
          submittedUserIds = new Set(
            submissions.map(function (s) {
              return s.userId;
            }),
          );
          ((_i = 0), (members_4 = members));
          _b.label = 4;
        case 4:
          if (!(_i < members_4.length)) return [3 /*break*/, 7];
          member = members_4[_i];
          // Skip members who already submitted
          if (submittedUserIds.has(member.userId)) return [3 /*break*/, 6];
          prefs = member.user.notificationPreferences;
          if (
            (prefs === null || prefs === void 0
              ? void 0
              : prefs.submissionReminder) === false
          )
            return [3 /*break*/, 6];
          ((_a = (0, submission_reminder_1.submissionReminderEmail)({
            leagueName: round.league.name,
            themeName: round.themeName,
            deadline: formatDate(round.submissionDeadline),
          })),
            (subject = _a.subject),
            (html = _a.html));
          return [
            4 /*yield*/,
            (0, client_2.sendEmail)({
              to: member.user.email,
              subject: subject,
              html: html,
            }),
          ];
        case 5:
          _b.sent();
          _b.label = 6;
        case 6:
          _i++;
          return [3 /*break*/, 4];
        case 7:
          return [2 /*return*/];
      }
    });
  });
}
