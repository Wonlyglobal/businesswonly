import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const outreachLeads = sqliteTable(
  "outreach_leads",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    fingerprint: text("fingerprint").notNull(),
    customsCustomerId: text("customs_customer_id").notNull().default(""),
    companyName: text("company_name").notNull(),
    country: text("country").notNull().default(""),
    website: text("website").notNull().default(""),
    contactName: text("contact_name").notNull(),
    contactTitle: text("contact_title").notNull().default(""),
    contactRole: text("contact_role").notNull().default(""),
    email: text("email").notNull().default(""),
    phone: text("phone").notNull().default(""),
    whatsapp: text("whatsapp").notNull().default(""),
    linkedin: text("linkedin").notNull().default(""),
    emailVerificationStatus: text("email_verification_status").notNull().default("unknown"),
    recentProducts: text("recent_products").notNull().default("[]"),
    importFrequency: text("import_frequency").notNull().default(""),
    importAmount: text("import_amount").notNull().default(""),
    suppliers: text("suppliers").notNull().default("[]"),
    lastPurchaseAt: text("last_purchase_at").notNull().default(""),
    source: text("source").notNull().default("TopEase CRM"),
    sourceUrl: text("source_url").notNull().default(""),
    syncStatus: text("sync_status").notNull().default("synced"),
    backgroundJson: text("background_json").notNull().default("{}"),
    syncedBy: text("synced_by").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_outreach_leads_fingerprint").on(table.fingerprint),
  ],
);
