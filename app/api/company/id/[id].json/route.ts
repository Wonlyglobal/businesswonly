import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../../chatgpt-auth";

export const dynamic = "force-dynamic";

async function authorized(request: Request) {
  const supplied = request.headers.get("x-leads-sync-secret") || "";
  const expected = process.env.LEADS_SYNC_SECRET || "";
  if (expected && supplied === expected) return true;
  return Boolean(await getChatGPTUser());
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await authorized(request))) return Response.json({ error: "Authentication required" }, { status: 401 });
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id < 1) return Response.json({ error: "Invalid id" }, { status: 400 });
  const row = await env.DB.prepare("SELECT * FROM outreach_leads WHERE id = ?").bind(id).first<Record<string, string>>();
  if (!row) return Response.json({ error: "Company not found" }, { status: 404 });
  return Response.json({
    id, businessCompanyId: String(id), name: row.company_name, companyName: row.company_name, country: row.country,
    website: row.website, contactName: row.contact_name, contactTitle: row.contact_title,
    contactRole: row.contact_role, contactEmail: row.email, contactPhone: row.phone,
    contactWhatsApp: row.whatsapp, contactLinkedIn: row.linkedin,
    source: row.source, sourceUrl: row.source_url, syncStatus: row.sync_status,
    background: JSON.parse(row.background_json || "{}"),
    contacts: [{ name: row.contact_name || "", title: row.contact_title || "", role: row.contact_role || "", email: row.email || "", phone: row.phone || "", whatsapp: row.whatsapp || "", linkedin: row.linkedin || "", verificationStatus: row.email_verification_status || "unknown" }],
  });
}
