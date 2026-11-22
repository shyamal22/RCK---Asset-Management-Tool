import { sql } from "drizzle-orm";
import { boolean, doublePrecision, index, integer, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { companies, crews } from "./company";
import { users } from "./users";
import { assets, assetTypes } from "./assets";
import { createdAt, deletedAt, id, updatedAt } from "./common";
import { precheckAnswerTypeEnum, precheckFlagEnum, precheckItemStatusEnum } from "./enums";

/**
 * Pre-check template (docs/07 §1): one per asset type, optionally overridden for a single asset.
 * Versioned: saving makes a new row (version + 1) and retires the old one, so completed pre-checks
 * keep pointing at the exact questions they answered.
 */
export const precheckTemplates = pgTable(
  "precheck_templates",
  {
    id: id(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    assetTypeId: uuid("asset_type_id").references(() => assetTypes.id),
    assetId: uuid("asset_id").references(() => assets.id),
    version: integer("version").notNull().default(1),
    isCurrent: boolean("is_current").notNull().default(true),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    uniqueIndex("precheck_templates_current_type").on(t.companyId, t.assetTypeId).where(sql`is_current and asset_type_id is not null`),
    uniqueIndex("precheck_templates_current_asset").on(t.companyId, t.assetId).where(sql`is_current and asset_id is not null`),
  ],
);

export const precheckTemplateItems = pgTable(
  "precheck_template_items",
  {
    id: id(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    templateId: uuid("template_id")
      .notNull()
      .references(() => precheckTemplates.id),
    position: integer("position").notNull(),
    question: text("question").notNull(),
    answerType: precheckAnswerTypeEnum("answer_type").notNull(),
    /** Yes/No only: which answer is the problem ('yes' or 'no'). */
    problemAnswer: text("problem_answer"),
    photoRequired: boolean("photo_required").notNull().default(true),
    help: text("help"),
  },
  (t) => [index("precheck_items_template_idx").on(t.templateId, t.position)],
);

/** A completed pre-check. Never deleted. `id` comes from the phone so a resend can't duplicate it. */
export const prechecks = pgTable(
  "prechecks",
  {
    id: id(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id),
    /** The asset's crew at the time (Supervisor sees their crew's). */
    crewId: uuid("crew_id").references(() => crews.id),
    templateId: uuid("template_id")
      .notNull()
      .references(() => precheckTemplates.id),
    doneBy: uuid("done_by")
      .notNull()
      .references(() => users.id),
    reading: numeric("reading", { precision: 12, scale: 1, mode: "number" }).notNull(),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    flag: precheckFlagEnum("flag").notNull(),
    doneAt: timestamp("done_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [
    index("prechecks_company_idx").on(t.companyId, t.doneAt),
    index("prechecks_asset_idx").on(t.assetId, t.doneAt),
  ],
);

/** One answer per template item. Yellow/red answers stay open on the asset until dealt with. */
export const precheckAnswers = pgTable(
  "precheck_answers",
  {
    id: id(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    precheckId: uuid("precheck_id")
      .notNull()
      .references(() => prechecks.id),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id),
    crewId: uuid("crew_id").references(() => crews.id),
    doneBy: uuid("done_by")
      .notNull()
      .references(() => users.id),
    itemId: uuid("item_id")
      .notNull()
      .references(() => precheckTemplateItems.id),
    position: integer("position").notNull(),
    /** Snapshot of the question as asked. */
    question: text("question").notNull(),
    answerType: precheckAnswerTypeEnum("answer_type").notNull(),
    answer: text("answer").notNull(),
    note: text("note"),
    photoPath: text("photo_path"),
    flag: precheckFlagEnum("flag").notNull(),
    status: precheckItemStatusEnum("status").notNull().default("open"),
    closedNote: text("closed_note"),
    closedBy: uuid("closed_by").references(() => users.id),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("precheck_answers_check_idx").on(t.precheckId, t.position),
    index("precheck_answers_open_idx").on(t.assetId, t.status, t.flag),
  ],
);
