import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

const companyDirectory = new URL("../api/company/", import.meta.url);

function sourceKey(value) {
  return String(value || "").trim().toLowerCase().replace(/#.*$/, "").replace(/\/$/, "");
}

test("research-ready company records contain two grouped, independent evidence sources", async () => {
  const files = (await readdir(companyDirectory)).filter((file) => file.endsWith(".json"));
  const failures = [];

  for (const file of files) {
    const company = JSON.parse(await readFile(new URL(file, companyDirectory), "utf8"));
    if (!String(company.researchStatus || "").includes("research_ready")) continue;

    const sourceGroups = new Map(
      (company.researchSources || [])
        .filter((source) => source?.url && source?.independenceGroup)
        .map((source) => [sourceKey(source.url), String(source.independenceGroup)]),
    );
    const evidence = (company.evidence || []).filter((item) =>
      item?.signal && item?.source && item?.sourceUrl && item?.date && Number(item?.confidence) >= 60,
    );
    const groups = new Set(evidence.map((item) =>
      item.independenceGroup || sourceGroups.get(sourceKey(item.sourceUrl)) || "",
    ).filter(Boolean));

    if (evidence.length < 2 || groups.size < 2) {
      failures.push(`${file}: evidence=${evidence.length}, independenceGroups=${groups.size}`);
    }
  }

  assert.deepEqual(failures, [], failures.join("\n"));
});
