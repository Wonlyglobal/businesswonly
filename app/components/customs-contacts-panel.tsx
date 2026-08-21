"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type OutreachLead = {
  id: number; customs_customer_id: string; company_name: string; country: string; website: string;
  contact_name: string; contact_title: string; contact_role: string; email: string; phone: string;
  whatsapp: string; linkedin: string; email_verification_status: string; recent_products: string;
  import_frequency: string; import_amount: string; last_purchase_at: string; source: string;
  source_url: string; sync_status: string; updated_at: string;
};

function contactLevel(lead: OutreachLead) {
  const title = `${lead.contact_title} ${lead.contact_role}`.toLowerCase();
  if (/owner|ceo|chief|director|head|采购总监|负责人|总经理/.test(title)) return "A";
  if (/manager|采购|sourcing|procurement|supply|供应链/.test(title)) return "B";
  return "C";
}

function displayTime(value: string) {
  if (!value) return "待同步";
  const date = new Date(value.replace(" ", "T") + (value.includes("Z") ? "" : "Z"));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN", { hour12: false });
}

export default function CustomsContactsPanel() {
  const [rows, setRows] = useState<OutreachLead[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/outreach-leads?limit=5000", { cache: "no-store" });
      if (response.status === 401) {
        setNeedsAuth(true);
        setRows([]);
        return;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json() as { rows?: OutreachLead[] };
      setRows(Array.isArray(payload.rows) ? payload.rows : []);
      setNeedsAuth(false);
      setError("");
      setLastUpdated(new Date());
    } catch {
      setError("联系人同步接口暂时不可用，系统将在 10 秒后自动重试。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 10_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return rows;
    return rows.filter((lead) => [lead.company_name, lead.contact_name, lead.contact_title, lead.contact_role, lead.email, lead.phone, lead.whatsapp, lead.linkedin, lead.country].join(" ").toLowerCase().includes(value));
  }, [query, rows]);

  const withEmail = rows.filter((lead) => Boolean(lead.email)).length;
  const withPhone = rows.filter((lead) => Boolean(lead.phone || lead.whatsapp)).length;
  const synced = rows.filter((lead) => lead.sync_status === "synced").length;

  if (needsAuth) {
    return <section className="contacts-panel auth-panel"><div className="eyebrow">联系人 / TopEase 海关数据</div><h1>海关关键联系人</h1><p>完整联系方式仅向已登录成员开放，避免客户邮箱和电话被公开访问。</p><a className="primary-btn auth-link" href="/signin-with-chatgpt?return_to=%2F">登录后查看联系人</a></section>;
  }

  return (
    <section className="contacts-panel">
      <header className="contacts-heading"><div><div className="eyebrow">联系人 / TopEase 海关数据</div><h1>海关关键联系人</h1><p>采购、供应链、Owner、CEO、Director、Manager 联系方式增量同步。</p></div><div className="live-actions"><span className="live-badge"><i />每 10 秒自动更新</span><button className="secondary-btn" onClick={() => void refresh()} disabled={loading}>{loading ? "同步中…" : "立即刷新"}</button></div></header>
      <div className="contact-metrics"><article><span>关键联系人</span><strong>{rows.length}</strong><small>TopEase 增量入库</small></article><article><span>有邮箱</span><strong>{withEmail}</strong><small>含验证状态</small></article><article><span>有电话 / WhatsApp</span><strong>{withPhone}</strong><small>优先采购决策链</small></article><article><span>已同步</span><strong>{synced}</strong><small>{lastUpdated ? `更新于 ${lastUpdated.toLocaleTimeString("zh-CN", { hour12: false })}` : "正在连接"}</small></article></div>
      <div className="contacts-toolbar"><input aria-label="搜索海关关键联系人" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索公司、姓名、职位、邮箱或电话" /><span>{filtered.length} 条联系人</span></div>
      {error && <div className="sync-error">{error}</div>}
      <div className="contacts-table-wrap"><table className="contacts-table"><thead><tr><th>公司 / 国家</th><th>关键联系人</th><th>联系方式</th><th>采购信号</th><th>分级</th><th>同步状态</th></tr></thead><tbody>{filtered.map((lead) => <tr key={lead.id}><td><strong>{lead.company_name}</strong><small>{lead.country || "国家待补充"}{lead.customs_customer_id ? ` · ${lead.customs_customer_id}` : ""}</small></td><td><strong>{lead.contact_name || "待补全"}</strong><small>{lead.contact_title || lead.contact_role || "职位待核验"}</small></td><td className="contact-methods">{lead.email && <a href={`mailto:${lead.email}`}>{lead.email}</a>}{(lead.phone || lead.whatsapp) && <span>{lead.phone || lead.whatsapp}</span>}{lead.linkedin && <a href={lead.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>}{!lead.email && !lead.phone && !lead.whatsapp && !lead.linkedin && <small>待挖掘</small>}</td><td><strong>{lead.import_frequency || lead.import_amount || "待采购证据"}</strong><small>{lead.last_purchase_at || lead.source || "TopEase CRM"}</small></td><td><span className={`level level-${contactLevel(lead).toLowerCase()}`}>{contactLevel(lead)}级</span></td><td><strong>{lead.sync_status || "synced"}</strong><small>{displayTime(lead.updated_at)}</small></td></tr>)}</tbody></table>{!loading && filtered.length === 0 && <div className="contacts-empty">暂未同步到关键联系人；TopEase 新增记录后会自动出现在这里。</div>}</div>
    </section>
  );
}
