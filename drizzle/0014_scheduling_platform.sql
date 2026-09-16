-- ── SPA-24: the scheduling platform's hand-written half ─────────────────────────────
--
-- 0013 (generated) creates `core_employee`, `core_team`, `core_employee_team`,
-- `core_notification` and `scheduling_schedule`. This file is its hand-written companion, the
-- same pairing as 0009/0010: drizzle-kit has no builder for a composite foreign key, and RLS
-- and triggers are policy, not schema. Drizzle applies pending migrations in one transaction,
-- so the pair lands as one.
--
-- ── Composite foreign keys ──────────────────────────────────────────────────────────
--
-- Postgres checks referential integrity with row security BYPASSED, so a single-column key
-- would let business A's schedule name business B's employee. `(business_id, X_id)` against the
-- parent's `(business_id, id)` unique makes the cross-tenant link a database error — the device
-- 0010 and 0012 explain in full. MATCH SIMPLE skips rows whose nullable id IS NULL, which is
-- what lets a schedule entry carry a job, a person or a team only where it has one.

ALTER TABLE "core_employee_team"
	ADD CONSTRAINT "core_employee_team_employee_fk"
	FOREIGN KEY ("business_id", "employee_id")
	REFERENCES "public"."core_employee"("business_id", "id")
	ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "core_employee_team"
	ADD CONSTRAINT "core_employee_team_team_fk"
	FOREIGN KEY ("business_id", "team_id")
	REFERENCES "public"."core_team"("business_id", "id")
	ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "core_notification"
	ADD CONSTRAINT "core_notification_employee_fk"
	FOREIGN KEY ("business_id", "employee_id")
	REFERENCES "public"."core_employee"("business_id", "id")
	ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "scheduling_schedule"
	ADD CONSTRAINT "scheduling_schedule_job_fk"
	FOREIGN KEY ("business_id", "job_id")
	REFERENCES "public"."core_job"("business_id", "id")
	ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "scheduling_schedule"
	ADD CONSTRAINT "scheduling_schedule_employee_fk"
	FOREIGN KEY ("business_id", "employee_id")
	REFERENCES "public"."core_employee"("business_id", "id")
	ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "scheduling_schedule"
	ADD CONSTRAINT "scheduling_schedule_team_fk"
	FOREIGN KEY ("business_id", "team_id")
	REFERENCES "public"."core_team"("business_id", "id")
	ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

-- ── Row Level Security ──────────────────────────────────────────────────────────────
--
-- ENABLE and FORCE, and the identical one-expression policy every table carries. ENABLE alone
-- leaves the table's owner exempt, and migrations run as the owner. Nothing here joins the
-- share-token surface: the four SELECT-only policies in 0006 remain this database's entire
-- public face, and neither the schedule, the roster nor a notification belongs on it.

ALTER TABLE "core_employee" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "core_employee" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "core_employee"
	USING ("business_id" = "app".current_business_id())
	WITH CHECK ("business_id" = "app".current_business_id());
--> statement-breakpoint

ALTER TABLE "core_team" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "core_team" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "core_team"
	USING ("business_id" = "app".current_business_id())
	WITH CHECK ("business_id" = "app".current_business_id());
--> statement-breakpoint

ALTER TABLE "core_employee_team" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "core_employee_team" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "core_employee_team"
	USING ("business_id" = "app".current_business_id())
	WITH CHECK ("business_id" = "app".current_business_id());
--> statement-breakpoint

ALTER TABLE "core_notification" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "core_notification" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "core_notification"
	USING ("business_id" = "app".current_business_id())
	WITH CHECK ("business_id" = "app".current_business_id());
--> statement-breakpoint

ALTER TABLE "scheduling_schedule" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "scheduling_schedule" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "scheduling_schedule"
	USING ("business_id" = "app".current_business_id())
	WITH CHECK ("business_id" = "app".current_business_id());
--> statement-breakpoint

-- ── updated_at ──────────────────────────────────────────────────────────────────────

CREATE TRIGGER "core_employee_touch" BEFORE UPDATE ON "core_employee"
	FOR EACH ROW EXECUTE FUNCTION "app".touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER "core_team_touch" BEFORE UPDATE ON "core_team"
	FOR EACH ROW EXECUTE FUNCTION "app".touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER "core_employee_team_touch" BEFORE UPDATE ON "core_employee_team"
	FOR EACH ROW EXECUTE FUNCTION "app".touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER "core_notification_touch" BEFORE UPDATE ON "core_notification"
	FOR EACH ROW EXECUTE FUNCTION "app".touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER "scheduling_schedule_touch" BEFORE UPDATE ON "scheduling_schedule"
	FOR EACH ROW EXECUTE FUNCTION "app".touch_updated_at();
--> statement-breakpoint

-- ── Audit ───────────────────────────────────────────────────────────────────────────
--
-- "Who put Thabo on Tuesday, and who took him off" is exactly the argument the schedule will
-- one day have to settle, and the roster and the notifications get the same treatment for the
-- same reason: the row-change log is the record the application cannot rewrite.

CREATE TRIGGER "core_employee_audit" AFTER INSERT OR UPDATE OR DELETE ON "core_employee"
	FOR EACH ROW EXECUTE FUNCTION "app".log_row_change('id');
--> statement-breakpoint
CREATE TRIGGER "core_team_audit" AFTER INSERT OR UPDATE OR DELETE ON "core_team"
	FOR EACH ROW EXECUTE FUNCTION "app".log_row_change('id');
--> statement-breakpoint
CREATE TRIGGER "core_employee_team_audit" AFTER INSERT OR UPDATE OR DELETE ON "core_employee_team"
	FOR EACH ROW EXECUTE FUNCTION "app".log_row_change('id');
--> statement-breakpoint
CREATE TRIGGER "core_notification_audit" AFTER INSERT OR UPDATE OR DELETE ON "core_notification"
	FOR EACH ROW EXECUTE FUNCTION "app".log_row_change('id');
--> statement-breakpoint
CREATE TRIGGER "scheduling_schedule_audit" AFTER INSERT OR UPDATE OR DELETE ON "scheduling_schedule"
	FOR EACH ROW EXECUTE FUNCTION "app".log_row_change('id');
