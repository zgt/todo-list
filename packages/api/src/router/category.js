"use strict";
var __makeTemplateObject =
  (this && this.__makeTemplateObject) ||
  function (cooked, raw) {
    if (Object.defineProperty) {
      Object.defineProperty(cooked, "raw", { value: raw });
    } else {
      cooked.raw = raw;
    }
    return cooked;
  };
var __assign =
  (this && this.__assign) ||
  function () {
    __assign =
      Object.assign ||
      function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s)
            if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
      };
    return __assign.apply(this, arguments);
  };
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
var __rest =
  (this && this.__rest) ||
  function (s, e) {
    var t = {};
    for (var p in s)
      if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
      for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
        if (
          e.indexOf(p[i]) < 0 &&
          Object.prototype.propertyIsEnumerable.call(s, p[i])
        )
          t[p[i]] = s[p[i]];
      }
    return t;
  };
var __spreadArray =
  (this && this.__spreadArray) ||
  function (to, from, pack) {
    if (pack || arguments.length === 2)
      for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
        }
      }
    return to.concat(ar || Array.prototype.slice.call(from));
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryRouter = void 0;
var server_1 = require("@trpc/server");
var v4_1 = require("zod/v4");
var db_1 = require("@acme/db");
var schema_1 = require("@acme/db/schema");
var trpc_1 = require("../trpc");
/** Ensure dates are proper Date objects for SuperJSON serialization */
function serializeCategory(category) {
  return __assign(__assign({}, category), {
    createdAt: new Date(category.createdAt),
    updatedAt: category.updatedAt ? new Date(category.updatedAt) : null,
    deletedAt: category.deletedAt ? new Date(category.deletedAt) : null,
  });
}
/** Get category IDs used by tasks in lists the user has access to */
function getSharedCategoryIds(database, userId) {
  return __awaiter(this, void 0, void 0, function () {
    var memberships, listIds, rows;
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          return [
            4 /*yield*/,
            database.query.TaskListMember.findMany({
              where: (0, db_1.eq)(schema_1.TaskListMember.userId, userId),
              columns: { listId: true },
            }),
          ];
        case 1:
          memberships = _a.sent();
          listIds = memberships.map(function (m) {
            return m.listId;
          });
          if (listIds.length === 0) return [2 /*return*/, []];
          return [
            4 /*yield*/,
            database
              .selectDistinct({ categoryId: schema_1.Task.categoryId })
              .from(schema_1.Task)
              .where(
                (0, db_1.and)(
                  (0, db_1.inArray)(schema_1.Task.listId, listIds),
                  (0, db_1.isNotNull)(schema_1.Task.categoryId),
                  (0, db_1.isNull)(schema_1.Task.deletedAt),
                ),
              ),
          ];
        case 2:
          rows = _a.sent();
          return [
            2 /*return*/,
            rows
              .map(function (r) {
                return r.categoryId;
              })
              .filter(function (id) {
                return id !== null;
              }),
          ];
      }
    });
  });
}
exports.categoryRouter = {
  // Get all non-deleted categories for current user (+ shared via lists)
  all: trpc_1.protectedProcedure.query(function (_a) {
    return __awaiter(void 0, [_a], void 0, function (_b) {
      var userId, sharedCategoryIds, categories, nameMap;
      var ctx = _b.ctx;
      return __generator(this, function (_c) {
        switch (_c.label) {
          case 0:
            userId = ctx.session.user.id;
            return [4 /*yield*/, getSharedCategoryIds(ctx.db, userId)];
          case 1:
            sharedCategoryIds = _c.sent();
            return [
              4 /*yield*/,
              ctx.db.query.Category.findMany({
                where: (0, db_1.and)(
                  (0, db_1.isNull)(schema_1.Category.deletedAt),
                  sharedCategoryIds.length > 0
                    ? (0, db_1.or)(
                        (0, db_1.eq)(schema_1.Category.userId, userId),
                        (0, db_1.inArray)(
                          schema_1.Category.id,
                          sharedCategoryIds,
                        ),
                      )
                    : (0, db_1.eq)(schema_1.Category.userId, userId),
                ),
                orderBy: [
                  (0, db_1.asc)(schema_1.Category.depth),
                  (0, db_1.asc)(schema_1.Category.sortOrder),
                  (0, db_1.desc)(schema_1.Category.createdAt),
                ],
              }),
            ];
          case 2:
            categories = _c.sent();
            nameMap = new Map(
              categories.map(function (c) {
                return [c.id, c.name];
              }),
            );
            return [
              2 /*return*/,
              categories.map(function (c) {
                return __assign(__assign({}, serializeCategory(c)), {
                  path: __spreadArray([], new Set(c.path), true).map(
                    function (id) {
                      var _a;
                      return (_a = nameMap.get(id)) !== null && _a !== void 0
                        ? _a
                        : id;
                    },
                  ),
                });
              }),
            ];
        }
      });
    });
  }),
  // Get category tree (roots with nested children)
  tree: trpc_1.protectedProcedure.query(function (_a) {
    return __awaiter(void 0, [_a], void 0, function (_b) {
      var userId,
        sharedCategoryIds,
        categories,
        nameMap,
        map,
        roots,
        _i,
        categories_1,
        cat,
        _c,
        categories_2,
        cat,
        node,
        parent_1;
      var ctx = _b.ctx;
      return __generator(this, function (_d) {
        switch (_d.label) {
          case 0:
            userId = ctx.session.user.id;
            return [4 /*yield*/, getSharedCategoryIds(ctx.db, userId)];
          case 1:
            sharedCategoryIds = _d.sent();
            return [
              4 /*yield*/,
              ctx.db.query.Category.findMany({
                where: (0, db_1.and)(
                  (0, db_1.isNull)(schema_1.Category.deletedAt),
                  sharedCategoryIds.length > 0
                    ? (0, db_1.or)(
                        (0, db_1.eq)(schema_1.Category.userId, userId),
                        (0, db_1.inArray)(
                          schema_1.Category.id,
                          sharedCategoryIds,
                        ),
                      )
                    : (0, db_1.eq)(schema_1.Category.userId, userId),
                ),
                orderBy: [
                  (0, db_1.asc)(schema_1.Category.sortOrder),
                  (0, db_1.desc)(schema_1.Category.createdAt),
                ],
              }),
            ];
          case 2:
            categories = _d.sent();
            nameMap = new Map(
              categories.map(function (c) {
                return [c.id, c.name];
              }),
            );
            map = new Map();
            roots = [];
            for (
              _i = 0, categories_1 = categories;
              _i < categories_1.length;
              _i++
            ) {
              cat = categories_1[_i];
              map.set(
                cat.id,
                __assign(__assign({}, cat), {
                  path: __spreadArray([], new Set(cat.path), true).map(
                    function (id) {
                      var _a;
                      return (_a = nameMap.get(id)) !== null && _a !== void 0
                        ? _a
                        : id;
                    },
                  ),
                  children: [],
                }),
              );
            }
            for (
              _c = 0, categories_2 = categories;
              _c < categories_2.length;
              _c++
            ) {
              cat = categories_2[_c];
              node = map.get(cat.id);
              if (!node) continue;
              if (cat.parentId) {
                parent_1 = map.get(cat.parentId);
                if (parent_1) {
                  parent_1.children.push(node);
                } else {
                  // Parent not found (deleted?), treat as root
                  roots.push(node);
                }
              } else {
                roots.push(node);
              }
            }
            return [2 /*return*/, roots];
        }
      });
    });
  }),
  // Get single category by ID
  byId: trpc_1.protectedProcedure
    .input(v4_1.z.object({ id: v4_1.z.string().uuid() }))
    .query(function (_a) {
      return __awaiter(void 0, [_a], void 0, function (_b) {
        var userId, sharedCategoryIds, category, ancestors, nameMap_1;
        var ctx = _b.ctx,
          input = _b.input;
        return __generator(this, function (_c) {
          switch (_c.label) {
            case 0:
              userId = ctx.session.user.id;
              return [4 /*yield*/, getSharedCategoryIds(ctx.db, userId)];
            case 1:
              sharedCategoryIds = _c.sent();
              return [
                4 /*yield*/,
                ctx.db.query.Category.findFirst({
                  where: (0, db_1.and)(
                    (0, db_1.eq)(schema_1.Category.id, input.id),
                    (0, db_1.isNull)(schema_1.Category.deletedAt),
                    sharedCategoryIds.length > 0
                      ? (0, db_1.or)(
                          (0, db_1.eq)(schema_1.Category.userId, userId),
                          (0, db_1.inArray)(
                            schema_1.Category.id,
                            sharedCategoryIds,
                          ),
                        )
                      : (0, db_1.eq)(schema_1.Category.userId, userId),
                  ),
                }),
              ];
            case 2:
              category = _c.sent();
              if (!category) return [2 /*return*/, null];
              if (!(category.path.length > 0)) return [3 /*break*/, 4];
              return [
                4 /*yield*/,
                ctx.db.query.Category.findMany({
                  where: (0, db_1.and)(
                    (0, db_1.inArray)(schema_1.Category.id, category.path),
                    (0, db_1.isNull)(schema_1.Category.deletedAt),
                  ),
                  columns: { id: true, name: true },
                }),
              ];
            case 3:
              ancestors = _c.sent();
              nameMap_1 = new Map(
                ancestors.map(function (a) {
                  return [a.id, a.name];
                }),
              );
              return [
                2 /*return*/,
                __assign(__assign({}, serializeCategory(category)), {
                  path: __spreadArray([], new Set(category.path), true).map(
                    function (id) {
                      var _a;
                      return (_a = nameMap_1.get(id)) !== null && _a !== void 0
                        ? _a
                        : id;
                    },
                  ),
                }),
              ];
            case 4:
              return [2 /*return*/, serializeCategory(category)];
          }
        });
      });
    }),
  // Get breadcrumb trail for a category
  breadcrumbs: trpc_1.protectedProcedure
    .input(
      v4_1.z.object({
        id: v4_1.z.string().uuid().optional(),
        taskId: v4_1.z.string().uuid().optional(),
      }),
    )
    .query(function (_a) {
      return __awaiter(void 0, [_a], void 0, function (_b) {
        var userId,
          categoryId,
          task,
          membership,
          category,
          ancestorIds,
          ancestors,
          orderMap,
          sorted;
        var _c, _d;
        var ctx = _b.ctx,
          input = _b.input;
        return __generator(this, function (_e) {
          switch (_e.label) {
            case 0:
              userId = ctx.session.user.id;
              categoryId = input.id;
              if (!(!categoryId && input.taskId)) return [3 /*break*/, 4];
              return [
                4 /*yield*/,
                ctx.db.query.Task.findFirst({
                  where: (0, db_1.and)(
                    (0, db_1.eq)(schema_1.Task.id, input.taskId),
                    (0, db_1.isNull)(schema_1.Task.deletedAt),
                  ),
                  columns: { categoryId: true, userId: true, listId: true },
                }),
              ];
            case 1:
              task = _e.sent();
              if (!task) return [3 /*break*/, 4];
              if (!(task.userId === userId)) return [3 /*break*/, 2];
              categoryId =
                (_c = task.categoryId) !== null && _c !== void 0
                  ? _c
                  : undefined;
              return [3 /*break*/, 4];
            case 2:
              if (!task.listId) return [3 /*break*/, 4];
              return [
                4 /*yield*/,
                ctx.db.query.TaskListMember.findFirst({
                  where: (0, db_1.and)(
                    (0, db_1.eq)(schema_1.TaskListMember.listId, task.listId),
                    (0, db_1.eq)(schema_1.TaskListMember.userId, userId),
                  ),
                  columns: { listId: true },
                }),
              ];
            case 3:
              membership = _e.sent();
              if (membership) {
                categoryId =
                  (_d = task.categoryId) !== null && _d !== void 0
                    ? _d
                    : undefined;
              }
              _e.label = 4;
            case 4:
              if (!categoryId) return [2 /*return*/, []];
              return [
                4 /*yield*/,
                ctx.db.query.Category.findFirst({
                  where: (0, db_1.and)(
                    (0, db_1.eq)(schema_1.Category.id, categoryId),
                    (0, db_1.isNull)(schema_1.Category.deletedAt),
                  ),
                }),
              ];
            case 5:
              category = _e.sent();
              if (!category) return [2 /*return*/, []];
              ancestorIds = category.path;
              if (ancestorIds.length === 0) {
                return [
                  2 /*return*/,
                  [
                    {
                      id: category.id,
                      name: category.name,
                      color: category.color,
                      icon: category.icon,
                    },
                  ],
                ];
              }
              return [
                4 /*yield*/,
                ctx.db.query.Category.findMany({
                  where: (0, db_1.and)(
                    (0, db_1.inArray)(schema_1.Category.id, ancestorIds),
                    (0, db_1.isNull)(schema_1.Category.deletedAt),
                  ),
                  columns: { id: true, name: true, color: true, icon: true },
                }),
              ];
            case 6:
              ancestors = _e.sent();
              orderMap = new Map(
                category.path.map(function (id, i) {
                  return [id, i];
                }),
              );
              sorted = __spreadArray([], ancestors, true).sort(function (a, b) {
                var _a, _b;
                return (
                  ((_a = orderMap.get(a.id)) !== null && _a !== void 0
                    ? _a
                    : 0) -
                  ((_b = orderMap.get(b.id)) !== null && _b !== void 0 ? _b : 0)
                );
              });
              // Append current category at the end
              sorted.push({
                id: category.id,
                name: category.name,
                color: category.color,
                icon: category.icon,
              });
              return [2 /*return*/, sorted];
          }
        });
      });
    }),
  // Create new category
  create: trpc_1.protectedProcedure
    .input(schema_1.CreateCategorySchema)
    .mutation(function (_a) {
      return __awaiter(void 0, [_a], void 0, function (_b) {
        var path, depth, parent_2, category;
        var ctx = _b.ctx,
          input = _b.input;
        return __generator(this, function (_c) {
          switch (_c.label) {
            case 0:
              path = [];
              depth = 0;
              if (!input.parentId) return [3 /*break*/, 3];
              return [
                4 /*yield*/,
                ctx.db.query.Category.findFirst({
                  where: (0, db_1.and)(
                    (0, db_1.eq)(schema_1.Category.id, input.parentId),
                    (0, db_1.eq)(schema_1.Category.userId, ctx.session.user.id),
                    (0, db_1.isNull)(schema_1.Category.deletedAt),
                  ),
                }),
              ];
            case 1:
              parent_2 = _c.sent();
              if (!parent_2) {
                throw new server_1.TRPCError({
                  code: "NOT_FOUND",
                  message: "Parent category not found",
                });
              }
              path = __spreadArray(
                __spreadArray([], parent_2.path, true),
                [parent_2.id],
                false,
              );
              depth = parent_2.depth + 1;
              if (!parent_2.isLeaf) return [3 /*break*/, 3];
              return [
                4 /*yield*/,
                ctx.db
                  .update(schema_1.Category)
                  .set({ isLeaf: false })
                  .where((0, db_1.eq)(schema_1.Category.id, parent_2.id)),
              ];
            case 2:
              _c.sent();
              _c.label = 3;
            case 3:
              return [
                4 /*yield*/,
                ctx.db
                  .insert(schema_1.Category)
                  .values(
                    __assign(__assign({}, input), {
                      userId: ctx.session.user.id,
                      path: path,
                      depth: depth,
                      isLeaf: true,
                    }),
                  )
                  .returning(),
              ];
            case 4:
              category = _c.sent()[0];
              if (!category) {
                throw new server_1.TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message: "Failed to create category",
                });
              }
              return [2 /*return*/, serializeCategory(category)];
          }
        });
      });
    }),
  // Update category (including reparenting)
  update: trpc_1.protectedProcedure
    .input(schema_1.UpdateCategorySchema)
    .mutation(function (_a) {
      return __awaiter(void 0, [_a], void 0, function (_b) {
        var id,
          parentId,
          rest,
          current,
          newPath,
          newDepth,
          newParent,
          depthDiff,
          descendants,
          _i,
          descendants_1,
          child,
          idxInPath,
          descendantSuffix,
          updatedPath,
          oldParentChildCount,
          updateData,
          updated;
        var ctx = _b.ctx,
          input = _b.input;
        return __generator(this, function (_c) {
          switch (_c.label) {
            case 0:
              ((id = input.id),
                (parentId = input.parentId),
                (rest = __rest(input, ["id", "parentId"])));
              return [
                4 /*yield*/,
                ctx.db.query.Category.findFirst({
                  where: (0, db_1.and)(
                    (0, db_1.eq)(schema_1.Category.id, id),
                    (0, db_1.eq)(schema_1.Category.userId, ctx.session.user.id),
                    (0, db_1.isNull)(schema_1.Category.deletedAt),
                  ),
                }),
              ];
            case 1:
              current = _c.sent();
              if (!current) {
                throw new server_1.TRPCError({
                  code: "NOT_FOUND",
                  message: "Category not found",
                });
              }
              if (!(parentId !== undefined && parentId !== current.parentId))
                return [3 /*break*/, 14];
              newPath = [];
              newDepth = 0;
              if (!(parentId !== null)) return [3 /*break*/, 4];
              // Prevent setting self as parent
              if (parentId === id) {
                throw new server_1.TRPCError({
                  code: "BAD_REQUEST",
                  message: "Category cannot be its own parent",
                });
              }
              return [
                4 /*yield*/,
                ctx.db.query.Category.findFirst({
                  where: (0, db_1.and)(
                    (0, db_1.eq)(schema_1.Category.id, parentId),
                    (0, db_1.eq)(schema_1.Category.userId, ctx.session.user.id),
                    (0, db_1.isNull)(schema_1.Category.deletedAt),
                  ),
                }),
              ];
            case 2:
              newParent = _c.sent();
              if (!newParent) {
                throw new server_1.TRPCError({
                  code: "NOT_FOUND",
                  message: "Parent category not found",
                });
              }
              // Prevent circular reference: new parent must not be a descendant of this category
              if (newParent.path.includes(id)) {
                throw new server_1.TRPCError({
                  code: "BAD_REQUEST",
                  message: "Cannot move category under its own descendant",
                });
              }
              newPath = __spreadArray(
                __spreadArray([], newParent.path, true),
                [newParent.id],
                false,
              );
              newDepth = newParent.depth + 1;
              if (!newParent.isLeaf) return [3 /*break*/, 4];
              return [
                4 /*yield*/,
                ctx.db
                  .update(schema_1.Category)
                  .set({ isLeaf: false })
                  .where((0, db_1.eq)(schema_1.Category.id, newParent.id)),
              ];
            case 3:
              _c.sent();
              _c.label = 4;
            case 4:
              depthDiff = newDepth - current.depth;
              // Update this category
              return [
                4 /*yield*/,
                ctx.db
                  .update(schema_1.Category)
                  .set(
                    __assign(__assign({}, rest), {
                      parentId: parentId,
                      path: newPath,
                      depth: newDepth,
                    }),
                  )
                  .where((0, db_1.eq)(schema_1.Category.id, id)),
              ];
            case 5:
              // Update this category
              _c.sent();
              return [
                4 /*yield*/,
                ctx.db.query.Category.findMany({
                  where: (0, db_1.and)(
                    (0, db_1.eq)(schema_1.Category.userId, ctx.session.user.id),
                    (0, db_1.arrayContains)(schema_1.Category.path, [id]),
                  ),
                }),
              ];
            case 6:
              descendants = _c.sent();
              ((_i = 0), (descendants_1 = descendants));
              _c.label = 7;
            case 7:
              if (!(_i < descendants_1.length)) return [3 /*break*/, 10];
              child = descendants_1[_i];
              idxInPath = child.path.indexOf(id);
              descendantSuffix = child.path.slice(idxInPath + 1);
              updatedPath = __spreadArray(
                __spreadArray(__spreadArray([], newPath, true), [id], false),
                descendantSuffix,
                true,
              );
              return [
                4 /*yield*/,
                ctx.db
                  .update(schema_1.Category)
                  .set({ path: updatedPath, depth: child.depth + depthDiff })
                  .where((0, db_1.eq)(schema_1.Category.id, child.id)),
              ];
            case 8:
              _c.sent();
              _c.label = 9;
            case 9:
              _i++;
              return [3 /*break*/, 7];
            case 10:
              if (!current.parentId) return [3 /*break*/, 13];
              return [
                4 /*yield*/,
                ctx.db
                  .select({
                    count: (0, db_1.sql)(
                      templateObject_1 ||
                        (templateObject_1 = __makeTemplateObject(
                          ["count(*)"],
                          ["count(*)"],
                        )),
                    ),
                  })
                  .from(schema_1.Category)
                  .where(
                    (0, db_1.and)(
                      (0, db_1.eq)(
                        schema_1.Category.parentId,
                        current.parentId,
                      ),
                      (0, db_1.eq)(
                        schema_1.Category.userId,
                        ctx.session.user.id,
                      ),
                      (0, db_1.isNull)(schema_1.Category.deletedAt),
                      (0, db_1.ne)(schema_1.Category.id, id),
                    ),
                  ),
              ];
            case 11:
              oldParentChildCount = _c.sent();
              if (
                !(
                  oldParentChildCount[0] &&
                  Number(oldParentChildCount[0].count) === 0
                )
              )
                return [3 /*break*/, 13];
              return [
                4 /*yield*/,
                ctx.db
                  .update(schema_1.Category)
                  .set({ isLeaf: true })
                  .where((0, db_1.eq)(schema_1.Category.id, current.parentId)),
              ];
            case 12:
              _c.sent();
              _c.label = 13;
            case 13:
              return [3 /*break*/, 16];
            case 14:
              updateData = __assign({}, rest);
              if (!(Object.keys(updateData).length > 0))
                return [3 /*break*/, 16];
              return [
                4 /*yield*/,
                ctx.db
                  .update(schema_1.Category)
                  .set(updateData)
                  .where(
                    (0, db_1.and)(
                      (0, db_1.eq)(schema_1.Category.id, id),
                      (0, db_1.eq)(
                        schema_1.Category.userId,
                        ctx.session.user.id,
                      ),
                    ),
                  ),
              ];
            case 15:
              _c.sent();
              _c.label = 16;
            case 16:
              return [
                4 /*yield*/,
                ctx.db.query.Category.findFirst({
                  where: (0, db_1.eq)(schema_1.Category.id, id),
                }),
              ];
            case 17:
              updated = _c.sent();
              if (!updated) {
                throw new server_1.TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message: "Failed to fetch updated category",
                });
              }
              return [2 /*return*/, serializeCategory(updated)];
          }
        });
      });
    }),
  // Soft delete category (and all descendants)
  delete: trpc_1.protectedProcedure
    .input(v4_1.z.string().uuid())
    .mutation(function (_a) {
      return __awaiter(void 0, [_a], void 0, function (_b) {
        var category, now, siblingCount;
        var ctx = _b.ctx,
          input = _b.input;
        return __generator(this, function (_c) {
          switch (_c.label) {
            case 0:
              return [
                4 /*yield*/,
                ctx.db.query.Category.findFirst({
                  where: (0, db_1.and)(
                    (0, db_1.eq)(schema_1.Category.id, input),
                    (0, db_1.eq)(schema_1.Category.userId, ctx.session.user.id),
                    (0, db_1.isNull)(schema_1.Category.deletedAt),
                  ),
                }),
              ];
            case 1:
              category = _c.sent();
              if (!category) {
                throw new server_1.TRPCError({
                  code: "NOT_FOUND",
                  message: "Category not found",
                });
              }
              now = new Date();
              // Soft-delete this category and all descendants
              // Descendants have this category's id in their path
              return [
                4 /*yield*/,
                ctx.db
                  .update(schema_1.Category)
                  .set({ deletedAt: now })
                  .where(
                    (0, db_1.and)(
                      (0, db_1.eq)(
                        schema_1.Category.userId,
                        ctx.session.user.id,
                      ),
                      (0, db_1.isNull)(schema_1.Category.deletedAt),
                      (0, db_1.arrayContains)(schema_1.Category.path, [input]),
                    ),
                  ),
              ];
            case 2:
              // Soft-delete this category and all descendants
              // Descendants have this category's id in their path
              _c.sent();
              // Also soft-delete the category itself
              return [
                4 /*yield*/,
                ctx.db
                  .update(schema_1.Category)
                  .set({ deletedAt: now })
                  .where((0, db_1.eq)(schema_1.Category.id, input)),
              ];
            case 3:
              // Also soft-delete the category itself
              _c.sent();
              if (!category.parentId) return [3 /*break*/, 6];
              return [
                4 /*yield*/,
                ctx.db
                  .select({
                    count: (0, db_1.sql)(
                      templateObject_2 ||
                        (templateObject_2 = __makeTemplateObject(
                          ["count(*)"],
                          ["count(*)"],
                        )),
                    ),
                  })
                  .from(schema_1.Category)
                  .where(
                    (0, db_1.and)(
                      (0, db_1.eq)(
                        schema_1.Category.parentId,
                        category.parentId,
                      ),
                      (0, db_1.eq)(
                        schema_1.Category.userId,
                        ctx.session.user.id,
                      ),
                      (0, db_1.isNull)(schema_1.Category.deletedAt),
                      (0, db_1.ne)(schema_1.Category.id, input),
                    ),
                  ),
              ];
            case 4:
              siblingCount = _c.sent();
              if (!(siblingCount[0] && Number(siblingCount[0].count) === 0))
                return [3 /*break*/, 6];
              return [
                4 /*yield*/,
                ctx.db
                  .update(schema_1.Category)
                  .set({ isLeaf: true })
                  .where((0, db_1.eq)(schema_1.Category.id, category.parentId)),
              ];
            case 5:
              _c.sent();
              _c.label = 6;
            case 6:
              return [2 /*return*/, { success: true }];
          }
        });
      });
    }),
};
var templateObject_1, templateObject_2;
