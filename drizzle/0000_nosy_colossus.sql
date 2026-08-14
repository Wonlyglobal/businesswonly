CREATE TABLE `outreach_leads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fingerprint` text NOT NULL,
	`customs_customer_id` text DEFAULT '' NOT NULL,
	`company_name` text NOT NULL,
	`country` text DEFAULT '' NOT NULL,
	`website` text DEFAULT '' NOT NULL,
	`contact_name` text NOT NULL,
	`contact_title` text DEFAULT '' NOT NULL,
	`contact_role` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`whatsapp` text DEFAULT '' NOT NULL,
	`linkedin` text DEFAULT '' NOT NULL,
	`email_verification_status` text DEFAULT 'unknown' NOT NULL,
	`recent_products` text DEFAULT '[]' NOT NULL,
	`import_frequency` text DEFAULT '' NOT NULL,
	`import_amount` text DEFAULT '' NOT NULL,
	`suppliers` text DEFAULT '[]' NOT NULL,
	`last_purchase_at` text DEFAULT '' NOT NULL,
	`source` text DEFAULT 'TopEase CRM' NOT NULL,
	`source_url` text DEFAULT '' NOT NULL,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`synced_by` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_outreach_leads_fingerprint` ON `outreach_leads` (`fingerprint`);
