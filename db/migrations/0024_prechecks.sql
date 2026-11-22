CREATE TYPE "public"."precheck_answer_type" AS ENUM('condition', 'yes_no', 'text');--> statement-breakpoint
CREATE TYPE "public"."precheck_flag" AS ENUM('green', 'yellow', 'red');--> statement-breakpoint
CREATE TYPE "public"."precheck_item_status" AS ENUM('open', 'dismissed', 'resolved');--> statement-breakpoint
CREATE TABLE "precheck_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"precheck_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"crew_id" uuid,
	"done_by" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"question" text NOT NULL,
	"answer_type" "precheck_answer_type" NOT NULL,
	"answer" text NOT NULL,
	"note" text,
	"photo_path" text,
	"flag" "precheck_flag" NOT NULL,
	"status" "precheck_item_status" DEFAULT 'open' NOT NULL,
	"closed_note" text,
	"closed_by" uuid,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "precheck_template_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"question" text NOT NULL,
	"answer_type" "precheck_answer_type" NOT NULL,
	"problem_answer" text,
	"photo_required" boolean DEFAULT true NOT NULL,
	"help" text
);
--> statement-breakpoint
CREATE TABLE "precheck_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"asset_type_id" uuid,
	"asset_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "prechecks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"crew_id" uuid,
	"template_id" uuid NOT NULL,
	"done_by" uuid NOT NULL,
	"reading" numeric(12, 1) NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"flag" "precheck_flag" NOT NULL,
	"done_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "last_precheck_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "last_precheck_by" uuid;--> statement-breakpoint
ALTER TABLE "precheck_answers" ADD CONSTRAINT "precheck_answers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "precheck_answers" ADD CONSTRAINT "precheck_answers_precheck_id_prechecks_id_fk" FOREIGN KEY ("precheck_id") REFERENCES "public"."prechecks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "precheck_answers" ADD CONSTRAINT "precheck_answers_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "precheck_answers" ADD CONSTRAINT "precheck_answers_crew_id_crews_id_fk" FOREIGN KEY ("crew_id") REFERENCES "public"."crews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "precheck_answers" ADD CONSTRAINT "precheck_answers_done_by_users_id_fk" FOREIGN KEY ("done_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "precheck_answers" ADD CONSTRAINT "precheck_answers_item_id_precheck_template_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."precheck_template_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "precheck_answers" ADD CONSTRAINT "precheck_answers_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "precheck_template_items" ADD CONSTRAINT "precheck_template_items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "precheck_template_items" ADD CONSTRAINT "precheck_template_items_template_id_precheck_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."precheck_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "precheck_templates" ADD CONSTRAINT "precheck_templates_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "precheck_templates" ADD CONSTRAINT "precheck_templates_asset_type_id_asset_types_id_fk" FOREIGN KEY ("asset_type_id") REFERENCES "public"."asset_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "precheck_templates" ADD CONSTRAINT "precheck_templates_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "precheck_templates" ADD CONSTRAINT "precheck_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prechecks" ADD CONSTRAINT "prechecks_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prechecks" ADD CONSTRAINT "prechecks_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prechecks" ADD CONSTRAINT "prechecks_crew_id_crews_id_fk" FOREIGN KEY ("crew_id") REFERENCES "public"."crews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prechecks" ADD CONSTRAINT "prechecks_template_id_precheck_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."precheck_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prechecks" ADD CONSTRAINT "prechecks_done_by_users_id_fk" FOREIGN KEY ("done_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "precheck_answers_check_idx" ON "precheck_answers" USING btree ("precheck_id","position");--> statement-breakpoint
CREATE INDEX "precheck_answers_open_idx" ON "precheck_answers" USING btree ("asset_id","status","flag");--> statement-breakpoint
CREATE INDEX "precheck_items_template_idx" ON "precheck_template_items" USING btree ("template_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "precheck_templates_current_type" ON "precheck_templates" USING btree ("company_id","asset_type_id") WHERE is_current and asset_type_id is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "precheck_templates_current_asset" ON "precheck_templates" USING btree ("company_id","asset_id") WHERE is_current and asset_id is not null;--> statement-breakpoint
CREATE INDEX "prechecks_company_idx" ON "prechecks" USING btree ("company_id","done_at");--> statement-breakpoint
CREATE INDEX "prechecks_asset_idx" ON "prechecks" USING btree ("asset_id","done_at");