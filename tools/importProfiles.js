// tools/importProfiles.js
// Excel/CSV から profiles/*.json を一括生成し、profiles/index.json も更新します。
// 使い方:
//   npm run import:csv   （tools/profiles.csv を読む）
//   npm run import:xlsx  （tools/profiles.xlsx を読む）

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const SRC_CSV  = path.join(ROOT, "tools", "profiles.csv");
const SRC_XLSX = path.join(ROOT, "tools", "profiles.xlsx");
const OUT_DIR  = path.join(ROOT, "profiles");
const OUT_INDEX = path.join(OUT_DIR, "index.json");

// ---- helpers ----
const ensureDir = (dir) => fs.existsSync(dir) || fs.mkdirSync(dir, { recursive: true });

const slugify = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")     // ダイアクリティカル除去
    .replace(/[^a-z0-9\- ]/g, "")
    .trim()
    .replace(/\s+/g, "-");

function toISODate(input) {
  if (!input) return undefined;
  // 既に YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(input))) return String(input);

  // 2020/1/2 や 2020.01.02 などをざっくり許容
  const s = String(input).replace(/[.\/]/g, "-");
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const y = m[1],
      mo = String(m[2]).padStart(2, "0"),
      d = String(m[3]).padStart(2, "0");
    return `${y}-${mo}-${d}`;
  }
  return undefined; // 変換不可なら undefined
}

function extractYouTubeId(v) {
  if (!v) return v;
  // 既にIDっぽい
  if (/^[A-Za-z0-9_-]{6,}$/i.test(v)) return v;
  try {
    const u = new URL(v);
    if (u.hostname.includes("youtu.be")) return u.pathname.replace("/", "");
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return id;
    }
  } catch (_) {}
  return v;
}

function readRows() {
  // 優先：xlsx > csv
  if (fs.existsSync(SRC_XLSX)) {
    const wb = XLSX.readFile(SRC_XLSX);
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { defval: "" });
  }
  if (fs.existsSync(SRC_CSV)) {
    const wb = XLSX.readFile(SRC_CSV); // SheetJSはCSVも読めます
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { defval: "" });
  }
  throw new Error("tools/profiles.xlsx か tools/profiles.csv が見つかりません。");
}

// ---- main ----
(async () => {
  ensureDir(OUT_DIR);

  const rows = readRows();
  if (!rows.length) {
    console.log("入力に行がありません。終了。");
    return;
  }

  const list = [];
  const created = [];
  const updated = [];
  const skipped = [];

  for (const raw of rows) {
    const name = (raw.name || "").trim();
    const country = (raw.country || "").trim();
    const ytRaw = (raw.ytId || "").trim();
    let slug = (raw.slug || "").trim();

    if (!name || !country || !ytRaw) {
      skipped.push({ reason: "必須欠落(name/country/ytId)", row: raw });
      continue;
    }

    if (!slug) slug = slugify(name);
    const ytId = extractYouTubeId(ytRaw);
    const birthdate = toISODate(raw.birthdate || "");

    // 個別JSONの最小フォーマットで保存
    const profile = { slug, name, country, ytId };
    if (birthdate) profile.birthdate = birthdate;

    const outfile = path.join(OUT_DIR, `${slug}.json`);
    const exists = fs.existsSync(outfile);
    fs.writeFileSync(outfile, JSON.stringify(profile, null, 2) + "\n", "utf8");
    exists ? updated.push(slug) : created.push(slug);

    // index用
    const indexRow = { slug, name, country, ytId };
    if (birthdate) indexRow.birthdate = birthdate;
    list.push(indexRow);
  }

  // name で安定ソート
  list.sort((a, b) => String(a.name).localeCompare(String(b.name), "ja"));

  fs.writeFileSync(OUT_INDEX, JSON.stringify({ list }, null, 2) + "\n", "utf8");

  console.log(`✅ 個別JSON作成: +${created.length}, 更新: ${updated.length}, スキップ: ${skipped.length}`);
  if (skipped.length) {
    console.log("── スキップ内訳 ──");
    for (const s of skipped) console.log(s.reason, s.row);
  }
  console.log(`✅ index.json 更新: ${list.length} 件`);
})();
