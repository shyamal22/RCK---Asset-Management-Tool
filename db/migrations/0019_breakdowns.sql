CREATE TYPE "public"."breakdown_severity" AS ENUM('usable', 'unusable');--> statement-breakpoint
CREATE TYPE "public"."breakdown_status" AS ENUM('open', 'dismissed', 'fixed');--> statement-breakpoint
CREATE TABLE "breakdown_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"crew_id" uuid,
	"raised_by" uuid NOT NULL,
	"title" text NOT NULL,
	"details" text NOT NULL,
	"severity" "breakdown_severity" NOT NULL,
	"photo_paths" text[] DEFAULT '{}'::text[] NOT NULL,
	"reading" numeric(12, 1),
	"lat" double precision,
	"lng" double precision,
	"status" "breakdown_status" DEFAULT 'open' NOT NULL,
	"closed_note" text,
	"closed_by" uuid,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "breakdown_reports" ADD CONSTRAINT "breakdown_reports_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "breakdown_reports" ADD CONSTRAINT "breakdown_reports_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "breakdown_reports" ADD CONSTRAINT "breakdown_reports_crew_id_crews_id_fk" FOREIGN KEY ("crew_id") REFERENCES "public"."crews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "breakdown_reports" ADD CONSTRAINT "breakdown_reports_raised_by_users_id_fk" FOREIGN KEY ("raised_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "breakdown_reports" ADD CONSTRAINT "breakdown_reports_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "breakdowns_company_status_idx" ON "breakdown_reports" USING btree ("company_id","status","created_at");--> statement-breakpoint
CREATE INDEX "breakdowns_asset_idx" ON "breakdown_reports" USING btree ("asset_id","status");