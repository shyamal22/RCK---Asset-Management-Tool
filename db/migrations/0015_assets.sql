CREATE TYPE "public"."asset_status" AS ENUM('available', 'in_use', 'unusable', 'in_workshop', 'at_subcontractor', 'parked', 'disposed');--> statement-breakpoint
CREATE TYPE "public"."compliance_kind" AS ENUM('cof', 'wof', 'ruc', 'rego', 'insurance', 'crane_cert', 'other');--> statement-breakpoint
CREATE TYPE "public"."reading_source" AS ENUM('manual', 'precheck', 'work_order', 'telematics', 'import');--> statement-breakpoint
CREATE TYPE "public"."tracking_unit" AS ENUM('hours', 'km');--> statement-breakpoint
CREATE TABLE "asset_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"default_unit" "tracking_unit",
	"code_prefix" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"asset_type_id" uuid NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"year" integer NOT NULL,
	"tracking_unit" "tracking_unit" NOT NULL,
	"current_reading" numeric(12, 1),
	"current_reading_at" timestamp with time zone,
	"status" "asset_status" DEFAULT 'available' NOT NULL,
	"site_id" uuid,
	"crew_id" uuid,
	"owner_entity_id" uuid,
	"rego" text,
	"vin_serial" text,
	"photo_path" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "compliance_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"kind" "compliance_kind" NOT NULL,
	"expires_on" date,
	"expires_at_reading" numeric(12, 1),
	"reference" text,
	"document_path" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "meter_readings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"reading" numeric(12, 1) NOT NULL,
	"unit" "tracking_unit" NOT NULL,
	"source" "reading_source" NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL,
	"entered_by" uuid,
	"lower_than_previous" boolean DEFAULT false NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "asset_types" ADD CONSTRAINT "asset_types_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_asset_type_id_asset_types_id_fk" FOREIGN KEY ("asset_type_id") REFERENCES "public"."asset_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_crew_id_crews_id_fk" FOREIGN KEY ("crew_id") REFERENCES "public"."crews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_owner_entity_id_owner_entities_id_fk" FOREIGN KEY ("owner_entity_id") REFERENCES "public"."owner_entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_items" ADD CONSTRAINT "compliance_items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_items" ADD CONSTRAINT "compliance_items_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_entered_by_users_id_fk" FOREIGN KEY ("entered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "asset_types_company_name" ON "asset_types" USING btree ("company_id",lower("name")) WHERE deleted_at is null;--> statement-breakpoint
CREATE UNIQUE INDEX "assets_company_code" ON "assets" USING btree ("company_id","code") WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "assets_company_idx" ON "assets" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "assets_crew_idx" ON "assets" USING btree ("crew_id");--> statement-breakpoint
CREATE INDEX "compliance_items_asset_idx" ON "compliance_items" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "compliance_items_company_expiry" ON "compliance_items" USING btree ("company_id","expires_on");--> statement-breakpoint
CREATE INDEX "meter_readings_asset_idx" ON "meter_readings" USING btree ("asset_id","read_at");