CREATE TABLE "core_employee" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"user_id" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "core_employee_business_id_unique" UNIQUE("business_id","id"),
	CONSTRAINT "core_employee_name_present" CHECK (length(btrim("core_employee"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "core_employee_team" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "core_employee_team_once" UNIQUE("business_id","employee_id","team_id")
);
--> statement-breakpoint
CREATE TABLE "core_team" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "core_team_business_id_unique" UNIQUE("business_id","id"),
	CONSTRAINT "core_team_name_unique" UNIQUE("business_id","name"),
	CONSTRAINT "core_team_name_present" CHECK (length(btrim("core_team"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "core_notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"title" text NOT NULL,
	"detail" text,
	"href" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "core_notification_title_present" CHECK (length(btrim("core_notification"."title")) > 0)
);
--> statement-breakpoint
CREATE TABLE "scheduling_schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"job_id" uuid,
	"title" text,
	"employee_id" uuid,
	"team_id" uuid,
	"day" date NOT NULL,
	"start_minute" integer NOT NULL,
	"end_minute" integer NOT NULL,
	"created_by_user_id" text NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scheduling_schedule_business_id_unique" UNIQUE("business_id","id"),
	CONSTRAINT "scheduling_schedule_titled" CHECK ("scheduling_schedule"."job_id" is not null or "scheduling_schedule"."title" is not null),
	CONSTRAINT "scheduling_schedule_one_assignee" CHECK (("scheduling_schedule"."employee_id" is null) <> ("scheduling_schedule"."team_id" is null)),
	CONSTRAINT "scheduling_schedule_clock" CHECK ("scheduling_schedule"."start_minute" >= 0 and "scheduling_schedule"."end_minute" <= 1440 and "scheduling_schedule"."start_minute" < "scheduling_schedule"."end_minute")
);
--> statement-breakpoint
ALTER TABLE "core_employee" ADD CONSTRAINT "core_employee_business_id_core_business_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."core_business"("business_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_employee_team" ADD CONSTRAINT "core_employee_team_business_id_core_business_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."core_business"("business_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_team" ADD CONSTRAINT "core_team_business_id_core_business_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."core_business"("business_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_notification" ADD CONSTRAINT "core_notification_business_id_core_business_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."core_business"("business_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduling_schedule" ADD CONSTRAINT "scheduling_schedule_business_id_core_business_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."core_business"("business_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "core_employee_business_idx" ON "core_employee" USING btree ("business_id","name");--> statement-breakpoint
CREATE INDEX "core_employee_team_team_idx" ON "core_employee_team" USING btree ("business_id","team_id");--> statement-breakpoint
CREATE INDEX "core_employee_team_employee_idx" ON "core_employee_team" USING btree ("business_id","employee_id");--> statement-breakpoint
CREATE INDEX "core_team_business_idx" ON "core_team" USING btree ("business_id","name");--> statement-breakpoint
CREATE INDEX "core_notification_recipient_idx" ON "core_notification" USING btree ("business_id","employee_id","read_at","created_at");--> statement-breakpoint
CREATE INDEX "scheduling_schedule_week_idx" ON "scheduling_schedule" USING btree ("business_id","day");--> statement-breakpoint
CREATE INDEX "scheduling_schedule_employee_idx" ON "scheduling_schedule" USING btree ("business_id","employee_id","day");--> statement-breakpoint
CREATE INDEX "scheduling_schedule_team_idx" ON "scheduling_schedule" USING btree ("business_id","team_id","day");--> statement-breakpoint
CREATE INDEX "scheduling_schedule_job_idx" ON "scheduling_schedule" USING btree ("business_id","job_id");