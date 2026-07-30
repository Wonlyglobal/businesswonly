// WONLY 背调「静态查询接口」生成器
// 读取 crawler/leads.json，产出：
//   api/company/<域名>.json   —— 每个域名一个公司背调（website 可解析出域名者）
//   api/index.json            —— 全量轻量索引（公司名/域名 → 文件），供对接方做匹配
//   api/README.md             —— 接口说明
// 用法：  node crawler/gen-api.mjs      （在项目根目录运行）
// 每次 leads.json 更新后重跑本脚本即可；push-only 脚本已自动调用。
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const leadsPath = join(root, 'crawler', 'leads.json');
const apiDir = join(root, 'api');
const companyDir = join(apiDir, 'company');

const domainOf = (website) => {
  if (!website) return '';
  try {
    let h = String(website).trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '');
    h = h.split('/')[0].split('?')[0].split('#')[0].toLowerCase().replace(/\.$/, '').trim();
    return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(h) ? h : '';
  } catch { return ''; }
};

const data = JSON.parse(readFileSync(leadsPath, 'utf8'));
const leads = Array.isArray(data.leads) ? data.leads : [];

// 清空旧的 api/company，避免残留已删除的公司
if (existsSync(companyDir)) rmSync(companyDir, { recursive: true, force: true });
mkdirSync(companyDir, { recursive: true });

// 每个域名保留 fitScore 最高的一条
const byDomain = new Map();
for (const l of leads) {
  const d = domainOf(l.website);
  if (!d) continue;
  const cur = byDomain.get(d);
  if (!cur || (Number(l.fitScore) || 0) > (Number(cur.fitScore) || 0)) byDomain.set(d, l);
}

let fileCount = 0;
for (const [d, l] of byDomain) {
  writeFileSync(join(companyDir, d + '.json'), JSON.stringify(l, null, 2), 'utf8');
  fileCount++;
}

// 轻量索引：所有线索（含无域名者，file 为 null）
const index = {
  generatedAt: data.generatedAt || '',
  total: leads.length,
  withDomain: fileCount,
  note: '按 domain 精确匹配 company/<domain>.json；无 domain 或按公司名匹配时，用本索引 normName 做模糊匹配。email/phone 查不到即为空，不编造。',
  companies: leads.map((l) => {
    const d = domainOf(l.website);
    return {
      company: l.company,
      normName: String(l.company || '').toLowerCase().replace(/[^a-z0-9一-龥]+/g, ''),
      domain: d || null,
      file: d ? ('company/' + d + '.json') : null,
      country: l.country, countryName: l.countryName, city: l.city || '',
      categoryName: l.categoryName || '', fitScore: l.fitScore ?? null,
      email: !!l.email, phone: !!l.phone
    };
  })
};
writeFileSync(join(apiDir, 'index.json'), JSON.stringify(index, null, 2), 'utf8');

const readme = `# WONLY 背调 · 静态查询接口

由 crawler/leads.json 生成的静态数据接口（GitHub Pages 托管，无后端、无鉴权）。

- 单个公司（按域名）：\`GET https://business.foreverdoodle.com/api/company/<域名>.json\`
  例：\`/api/company/htamba.com.json\`
- 全量索引：\`GET https://business.foreverdoodle.com/api/index.json\`
  用 \`companies[]\` 里的 \`normName\` 做公司名模糊匹配，\`domain\`/\`file\` 定位单公司文件。

字段说明见《WONLY 背调 API 对接说明》。数据每日更新；本目录由 \`node crawler/gen-api.mjs\` 生成，请勿手改。
生成时间：${index.generatedAt} ｜ 域名文件数：${fileCount} ｜ 线索总数：${leads.length}
`;
writeFileSync(join(apiDir, 'README.md'), readme, 'utf8');

console.log(`gen-api: ${fileCount} company files + index.json (${leads.length} leads)`);
