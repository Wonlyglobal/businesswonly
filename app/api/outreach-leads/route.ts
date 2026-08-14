import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

type LeadInput = {
  customsCustomerId?: string; companyName: string; country?: string; website?: string;
  contactName: string; contactTitle?: string; contactRole?: string; email?: string;
  phone?: string; whatsapp?: string; linkedin?: string; emailVerificationStatus?: string;
  recentProducts?: string[]; importFrequency?: string; importAmount?: string;
  suppliers?: string[]; lastPurchaseAt?: string; source?: string; sourceUrl?: string;
  syncStatus?: string;
};

const createTableSql = `CREATE TABLE IF NOT EXISTS outreach_leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fingerprint TEXT NOT NULL,
  customs_customer_id TEXT NOT NULL DEFAULT '', company_name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT '', website TEXT NOT NULL DEFAULT '',
  contact_name TEXT NOT NULL, contact_title TEXT NOT NULL DEFAULT '',
  contact_role TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '', whatsapp TEXT NOT NULL DEFAULT '',
  linkedin TEXT NOT NULL DEFAULT '', email_verification_status TEXT NOT NULL DEFAULT 'unknown',
  recent_products TEXT NOT NULL DEFAULT '[]', import_frequency TEXT NOT NULL DEFAULT '',
  import_amount TEXT NOT NULL DEFAULT '', suppliers TEXT NOT NULL DEFAULT '[]',
  last_purchase_at TEXT NOT NULL DEFAULT '', source TEXT NOT NULL DEFAULT 'TopEase CRM',
  source_url TEXT NOT NULL DEFAULT '', sync_status TEXT NOT NULL DEFAULT 'synced',
  synced_by TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;

async function ensureSchema() {
  await env.DB.batch([
    env.DB.prepare(createTableSql),
    env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_outreach_leads_fingerprint ON outreach_leads (fingerprint)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_outreach_leads_company_name ON outreach_leads (company_name)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_outreach_leads_sync_status ON outreach_leads (sync_status)"),
  ]);
}

function clean(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function normalizedArray(value: unknown) { return Array.isArray(value) ? value.map(clean).filter(Boolean) : []; }

async function fingerprintFor(lead: LeadInput) {
  const identity = [lead.companyName, lead.contactName, lead.email || "", lead.phone || ""]
    .map((value) => clean(value).toLowerCase()).join("|");
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(identity));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function validateLead(value: unknown): LeadInput | null {
  if (!value || typeof value !== "object") return null;
  const lead = value as Partial<LeadInput>;
  if (!clean(lead.companyName) || !clean(lead.contactName)) return null;
  if (![lead.email, lead.phone, lead.whatsapp, lead.linkedin].some((item) => clean(item))) return null;
  return lead as LeadInput;
}

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  await ensureSchema();
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 100, 1), 500);
  const status = clean(url.searchParams.get("status"));
  const result = status
    ? await env.DB.prepare("SELECT * FROM outreach_leads WHERE sync_status = ? ORDER BY updated_at DESC LIMIT ?").bind(status, limit).all()
    : await env.DB.prepare("SELECT * FROM outreach_leads ORDER BY updated_at DESC LIMIT ?").bind(limit).all();
  return Response.json({ rows: result.results, count: result.results.length });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  await ensureSchema();
  const body = await request.json().catch(() => null);
  const candidates = Array.isArray(body) ? body : Array.isArray(body?.leads) ? body.leads : [body];
  const leads = candidates.map(validateLead).filter((lead): lead is LeadInput => Boolean(lead));
  if (!leads.length) return Response.json({ error: "No valid contacts" }, { status: 400 });

  const statements = [];
  for (const lead of leads.slice(0, 500)) {
    const fingerprint = await fingerprintFor(lead);
    statements.push(env.DB.prepare(`INSERT INTO outreach_leads (
      fingerprint, customs_customer_id, company_name, country, website, contact_name,
      contact_title, contact_role, email, phone, whatsapp, linkedin,
      email_verification_status, recent_products, import_frequency, import_amount,
      suppliers, last_purchase_at, source, source_url, sync_status, synced_by, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(fingerprint) DO UPDATE SET
      customs_customer_id=excluded.customs_customer_id, country=excluded.country,
      website=excluded.website, contact_title=excluded.contact_title,
      contact_role=excluded.contact_role, email=excluded.email, phone=excluded.phone,
      whatsapp=excluded.whatsapp, linkedin=excluded.linkedin,
      email_verification_status=excluded.email_verification_status,
      recent_products=excluded.recent_products, import_frequency=excluded.import_frequency,
      import_amount=excluded.import_amount, suppliers=excluded.suppliers,
      last_purchase_at=excluded.last_purchase_at, source=excluded.source,
      source_url=excluded.source_url, sync_status=excluded.sync_status,
      synced_by=excluded.synced_by, updated_at=CURRENT_TIMESTAMP`).bind(
      fingerprint, clean(lead.customsCustomerId), clean(lead.companyName), clean(lead.country),
      clean(lead.website), clean(lead.contactName), clean(lead.contactTitle), clean(lead.contactRole),
      clean(lead.email), clean(lead.phone), clean(lead.whatsapp), clean(lead.linkedin),
      clean(lead.emailVerificationStatus) || "unknown", JSON.stringify(normalizedArray(lead.recentProducts)),
      clean(lead.importFrequency), clean(lead.importAmount), JSON.stringify(normalizedArray(lead.suppliers)),
      clean(lead.lastPurchaseAt), clean(lead.source) || "TopEase CRM", clean(lead.sourceUrl),
      clean(lead.syncStatus) || "synced", user.email,
    ));
  }
  await env.DB.batch(statements);
  return Response.json({ accepted: statements.length, deduplicatedBy: "fingerprint" });
}
