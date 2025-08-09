// tools/importProfiles.js
// CSV から profiles/*.json を一括生成し、profiles/index.json も更新します。
// 使い方: node tools/importProfiles.js  （GitHub Actions からも同じ）
//
// 入力: tools/profiles.csv
// 必須列: name, country, ytId
// 任意列: slug, birthdate(YYYY-MM-DD または 2020/1/2 など)
// 備考: slug が無ければ name から自動生成。ytId はURLでもOK。

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const SRC_CSV   = path.join(ROOT, "tools", "profiles.csv");
const OUT_DIR   = path.join(ROOT, "profiles");
const OUT_INDEX = path.join(OUT_DIR, "index.json");

/* ========== helpers ========== */
const ensureDir = (dir) => fs.existsSync(dir) || fs.mkdirSync(dir, { recursive: true });

const slugify = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\- ]/g, "")
    .trim()
    .replace(/\s+/g, "-");

function toISODate(input) {
  if (!input) return undefined;
  const str = String(input).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  // 2020/1/2, 2020.01.02 → 2020-01-02
  const s = str.replace(/[.\/]/g, "-");
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const y = m[1],
      mo = String(m[2]).padStart(2, "0"),
      d = String(m[3]).padStart(2, "0");
    return `${y}-${mo}-${d}`;
  }
  return undefined;
}

function extractYouTubeId(v) {
  if (!v) return v;
  if (/^[A-Za-z0-9_-]{6,}$/.test(v)) return v; // 既にID風
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

/** シンプルCSVパーサ（RFC4180相当：ダブルクォート対応） */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  // 統一改行
  const s = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          cell += '"';
          i++; // 連続二重引用 → エスケープ
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(cell);
        cell = "";
      } else if (c === "\n") {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += c;
      }
    }
  }
  // 末尾セル・行
  row.push(cell);
  rows.push(row);

  // ヘッダ → オブジェクト配列
  const header = rows.shift().map(h => String(h || "").trim());
  return rows
    .filter(r => r.some(v => String(v).trim() !== "")) // 空行除去
    .map(r => {
      const obj = {};
      header.forEach((h, idx) => (obj[h] = r[idx] !== undefined ? String(r[idx]).trim() : ""));
      return obj;
    });
}

/* ========== main ========== */
(async () => {
  ensureDir(OUT_DIR);

  if (!fs.existsSync(SRC_CSV)) {
    console.error("❌ tools/profiles.csv が見つかりません。");
    process.exit(1);
  }

  const csvText = fs.readFileSync(SRC_CSV, "utf8");
  const rows = parseCSV(csvText);
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

    // 個別JSON（最小）
    const profile = { slug, name, country, ytId };
    if (birthdate) profile.birthdate = birthdate;

    const outfile = path.join(OUT_DIR, `${slug}.json`);
    const exists = fs.existsSync(outfile);
    fs.writeFileSync(outfile, JSON.stringify(profile, null, 2) + "\n", "utf8");
    exists ? updated.push(slug) : created.push(slug);

    // index用
    const idx = { slug, name, country, ytId };
    if (birthdate) idx.birthdate = birthdate;
    list.push(idx);
  }

  list.sort((a, b) => String(a.name).localeCompare(String(b.name), "ja"));
  fs.writeFileSync(OUT_INDEX, JSON.stringify({ list }, null, 2) + "\n", "utf8");

  console.log(`✅ 個別JSON 作成:${created.length} / 更新:${updated.length} / スキップ:${skipped.length}`);
  if (skipped.length) {
    console.log("── スキップ内訳 ──");
    for (const s of skipped) console.log(s.reason, s.row);
  }
  console.log(`✅ index.json 更新: ${list.length} 件`);
})();
