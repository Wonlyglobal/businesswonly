import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../chatgpt-auth";

export const dynamic = "force-dynamic";

async function authorized(request: Request) {
  const supplied = request.headers.get("x-leads-sync-secret") || "";
  const expected = process.env.LEADS_SYNC_SECRET || "";
  if (expected && supplied && supplied === expected) return true;
  return Boolean(await getChatGPTUser());
}

function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0];
}

export async function GET(request: Request, context: { params: Promise<{ domain: string }> }) {
  if (!(await authorized(request))) return Response.json({ error: "Authentication required" }, { status: 401 });
  const domain = normalizeDomain(decodeURIComponent((await context.params).domain));
  if (!domain) return Response.json({ error: "Missing domain" }, { status: 400 });

  const result = await env.DB.prepare(`SELECT * FROM outreach_leads
    WHERE lower(website) = ? OR lower(website) = ? OR lower(website) LIKE ? OR lower(website) LIKE ?
    ORDER BY CASE WHEN email != '' THEN 0 ELSE 1 END, updated_at DESC
    LIMIT 25`).bind(domain, `www.${domain}`, `%://${domain}%`, `%www.${domain}%`).all<Record<string, unknown>>();
  if (!result.results.length) return Response.json({ error: "Company not found", domain }, { status: 404 });

  const primary = result.results[0] as Record<string, string>;
  const backgroundRow = result.results.find((row) => String(row.background_json || "") !== "{}") || primary;
  const contacts = result.results.map((row) => ({
    name: row.contact_name || "", title: row.contact_title || "", role: row.contact_role || "",
    email: row.email || "", phone: row.phone || "", whatsapp: row.whatsapp || "",
    linkedin: row.linkedin || "", verificationStatus: row.email_verification_status || "unknown",
  }));
  const background = JSON.parse(String(backgroundRow.background_json || "{}"));
  const recentProducts = JSON.parse(primary.recent_products || "[]");
  const evidence = [] as Array<{ signal: string; source: string; date: string; confidence: number }>;
  if (recentProducts.length && primary.last_purchase_at) evidence.push({ signal: `${recentProducts.slice(0, 5).join(", ")}${primary.import_frequency ? ` · ${primary.import_frequency}` : ""}`, source: "Business customs records", date: primary.last_purchase_at, confidence: 88 });
  const websiteSignal = [background.productFocus || background.mainBusiness || background.industry || "", background.projects || background.expansion || "", background.fitReason || background.demandHypothesis || ""].filter(Boolean).join(" · ");
  const websiteSource = background.sourceUrl || background.officialWebsite || background.website || primary.source_url || primary.website;
  const websiteDate = background.evidenceDate || background.addedDate || background.updatedAt || primary.updated_at;
  if (websiteSignal && websiteSource && websiteDate) evidence.push({ signal: websiteSignal, source: websiteSource, date: websiteDate, confidence: Number(background.confidence || 65) || 65 });
  return Response.json({
    businessCompanyId: String(primary.id), domain, name: primary.company_name, companyName: primary.company_name,
    country: primary.country, website: primary.website,
    contactName: primary.contact_name, contactTitle: primary.contact_title,
    contactRole: primary.contact_role, contactEmail: primary.email,
    contactPhone: primary.phone, contactLinkedIn: primary.linkedin,
    recentProducts,
    importFrequency: primary.import_frequency, importAmount: primary.import_amount,
    suppliers: JSON.parse(primary.suppliers || "[]"), lastPurchaseAt: primary.last_purchase_at,
    source: primary.source, sourceUrl: primary.source_url, updatedAt: primary.updated_at, contacts,
    background, evidence,
  });
}
