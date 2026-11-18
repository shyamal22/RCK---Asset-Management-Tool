ALTER TABLE "trusted_devices" ADD COLUMN "webauthn_challenge" text;--> statement-breakpoint
ALTER TABLE "trusted_devices" ADD COLUMN "challenge_expires_at" timestamp with time zone;