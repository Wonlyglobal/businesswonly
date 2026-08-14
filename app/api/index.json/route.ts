import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

async function authorized(request: Request) {
  const supplied = request.headers.get("x-leads-sync-secret") || "";
  const expected = process.env.LEADS_SYNC_SECRET || "";
  if (expected && supplied && supplied === expected) return true;
  return Boolean(await getChatGPTUser());
}

function domainFromWebsite(value: unknown) {
  const text = typeof value === "string" ? value.trim().toLowerCase() : "";
  return text.replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0];
}

export async function GET(request: Request) {
  if (!(await authorized(request))) return Response.json({ error: "Authentication required" }, { status: 401 });
  const result = await env.DB.prepare(`SELECT id, company_name, website, country, contact_name, contact_title,
    contact_role, email, phone, whatsapp, linkedin, email_verification_status, sync_status, updated_at
    FROM outreach_leads ORDER BY updated_at DESC LIMIT 5000`).all();
  const companies = result.results.map((row) => ({
    normName: String(row.company_name || ""),
    name: String(row.company_name || ""),
    domain: domainFromWebsite(row.website),
    file: `company/id/${String(row.id)}.json`,
    country: String(row.country || ""),
    contact: {
      name: String(row.contact_name || ""), title: String(row.contact_title || ""),
      role: String(row.contact_role || ""), email: String(row.email || ""),
      phone: String(row.phone || ""), whatsapp: String(row.whatsapp || ""),
      linkedin: String(row.linkedin || ""), verificationStatus: String(row.email_verification_status || "unknown"),
      syncStatus: String(row.sync_status || "synced"), updatedAt: String(row.updated_at || ""),
    },
  }));
  return Response.json({ total: companies.length, companies });
}
