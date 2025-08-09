// profiles/*.json → profiles/index.json を生成（上書き）
// 使い方: npm run build:index
//
// 出力フィールド（最小限・固定）：slug, name, country, birthdate(任意), ytId
// 仕様：
// - slug が無ければファイル名から自動付与（小文字）
// - ytId は単体 or videoIds[0] を採用。URLなら ID を抽出
// - birthdate は書いてあればそのまま出力（YYYY-MM-DD 推奨）
// - 並び順は name の五十音/アルファベット順
//
// ※ age / bestResult などは index.json には書き出しません。
//    年齢表示はフロントで birthdate から動的計算してください。

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const PROFILES_DIR = path.join(ROOT, "profiles");
const OUTPUT = path.join(PROFILES_DIR, "index.json");

// ---------- helpers ----------
function readJSONSafe(file) {
  let txt = fs.readFileSync(file, "utf8");
  if (txt.charCodeAt(0) === 0xfeff) txt = txt.slice(1); // BOM除去
  return JSON.parse(txt);
}

function extractYouTubeId(v) {
  if (!v) return v;
  // 既にIDっぽい
  if (/^[A-Za-z0-9_-]{6,}$/i.test(v)) return v;
  // URLから抽出
  try {
    const u = new URL(v);
    if (u.hostname.includes("youtu.be")) {
      return u.pathname.replace("/", "");
    }
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return id;
    }
  } catch (_) {
    /* 通常文字列ならそのまま返す */
  }
  return v;
}

// 一覧用の最小フィールド抽出 & バリデーション
function pickForList(data, fileBase) {
  const warnings = [];

  const slug = String((data.slug ?? fileBase)).toLowerCase();
  const name = data.name;
  const country = data.country;
  const ytId = extractYouTubeId(data.ytId);

  // birthdate は任意（形式チェックは警告のみ）
  const birthdate = data.birthdate ?? undefined;
  if (birthdate && !/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) {
    warnings.push(`birthdate 形式が不正: ${birthdate}（YYYY-MM-DD 推奨）`);
  }

  const obj = { slug, name, country, ytId };
  if (birthdate) obj.birthdate = birthdate; // 任意なので存在時のみ付与

  const missing = [];
  if (!slug) missing.push("slug");
  if (!name) missing.push("name");
  if (!country) missing.push("country");
  if (!ytId) missing.push("ytId");

  return { obj, missing, warnings };
}

// ---------- main ----------
function main() {
  if (!fs.existsSync(PROFILES_DIR)) {
    console.error(`profiles ディレクトリが見つかりません: ${PROFILES_DIR}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(PROFILES_DIR)
    .filter((f) => f.endsWith(".json") && f !== "index.json");

  if (files.length === 0) {
    console.warn("profiles/*.json が見つかりません。何も出力しません。");
    return;
  }

  const list = [];
  const warns = [];

  for (const f of files) {
    const full = path.join(PROFILES_DIR, f);
    const base = path.basename(f, ".json");
    try {
      const data = readJSONSafe(full);
      const { obj, missing, warnings } = pickForList(data, base);
      if (warnings.length) warns.push(`⚠ ${f}: ${warnings.join(" / ")}`);
      if (missing.length) {
        warns.push(`⚠ ${f}: 必須キー不足 -> ${missing.join(", ")}`);
        continue;
      }
      list.push(obj);
    } catch (e) {
      warns.push(`⚠ ${f}: JSON 解析エラー -> ${e.message}`);
    }
  }

  // name で安定ソート（日本語対応）
  list.sort((a, b) => String(a.name).localeCompare(String(b.name), "ja"));

  fs.writeFileSync(OUTPUT, JSON.stringify({ list }, null, 2) + "\n", "utf8");

  console.log(`✅ 生成完了: ${path.relative(ROOT, OUTPUT)} (${list.length}件)`);
  if (warns.length) {
    console.log("── 警告 ──");
    for (const w of warns) console.log(w);
  }
}

main();
