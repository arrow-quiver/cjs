ALTER TABLE "core_job" DROP CONSTRAINT "core_job_customer_id_core_customer_id_fk";
--> statement-breakpoint
ALTER TABLE "quoting_quote" DROP CONSTRAINT "quoting_quote_customer_id_core_customer_id_fk";
--> statement-breakpoint
ALTER TABLE "invoicing_invoice" DROP CONSTRAINT "invoicing_invoice_customer_id_core_customer_id_fk";
--> statement-breakpoint
ALTER TABLE "core_customer" ADD CONSTRAINT "core_customer_business_id_unique" UNIQUE("business_id","id");--> statement-breakpoint

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- HAND-WRITTEN BELOW. THE CUSTOMER KEYS BECOME COMPOSITE.
--
-- Postgres checks referential integrity with row security BYPASSED, so a key on
-- `core_customer.id` alone accepted business A's quote, invoice or job naming business B's
-- customer. RLS hid the row from every read and nothing refused the link. Each key now names
-- `(business_id, customer_id)`, against the unique added above, which makes a cross-tenant link a
-- database error. drizzle-kit has no builder for a composite key, so these are written by hand,
-- exactly as `quoting_quote_job_fk` was in 0010.
--
-- The drops above and the adds below are ONE change: the migrator applies this file in one
-- transaction, and applying half of it would leave three tables with no customer key at all.
--
-- `MATCH SIMPLE` (the default) skips the check when `customer_id` is NULL, which is what a fresh
-- draft quote or invoice has. The `(business_id, customer_id)` indexes these keys need already
-- exist (0005, 0007, 0009).
-- ─────────────────────────────────────────────────────────────────────────────────────────────

ALTER TABLE "quoting_quote" ADD CONSTRAINT "quoting_quote_customer_fk"
	FOREIGN KEY ("business_id", "customer_id") REFERENCES "public"."core_customer"("business_id", "id")
	ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "invoicing_invoice" ADD CONSTRAINT "invoicing_invoice_customer_fk"
	FOREIGN KEY ("business_id", "customer_id") REFERENCES "public"."core_customer"("business_id", "id")
	ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "core_job" ADD CONSTRAINT "core_job_customer_fk"
	FOREIGN KEY ("business_id", "customer_id") REFERENCES "public"."core_customer"("business_id", "id")
	ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

-- THE SAME PHONE, HOWEVER IT WAS TYPED. Adding a customer checks the business's other customers
-- for the same number by its last nine digits (`phoneTail` in `$lib/core/customers`), so
-- `+27 82 123 4567` and `082 123 4567` are one phone. This is that expression, indexed per
-- business, so the check stays a lookup however long the address book grows.
CREATE INDEX "core_customer_phone_tail_idx" ON "core_customer" USING btree (
	"business_id",
	right(regexp_replace("phone", '\D', '', 'g'), 9)
);
