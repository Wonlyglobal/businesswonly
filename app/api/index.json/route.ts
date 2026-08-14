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
  const result = await env.DB.prepare(`SELECT company_name, website, country, MAX(updated_at) AS updated_at
    FROM outreach_leads WHERE website != '' AND email != ''
    GROUP BY lower(website), company_name, country ORDER BY updated_at DESC LIMIT 5000`).all();
  const companies = result.results.map((row) => ({
    normName: String(row.company_name || ""),
    name: String(row.company_name || ""),
    domain: domainFromWebsite(row.website),
    country: String(row.country || ""),
  })).filter((row) => row.domain);
  return Response.json({ total: companies.length, companies });
}
