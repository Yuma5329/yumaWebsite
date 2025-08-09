// profiles/*.json から profiles/index.json を生成（上書き）
// 使い方: npm run build:index
//
// 必須項目: slug, name, country, ytId  ※ytIdが無ければ videoIds[0] を利用
// 任意項目: birthdate(YYYY-MM-DD), age(数値/文字列), bestResult
//
// 仕様:
// - slug が無ければファイル名から自動付与
// - age は数値化を試みる（"25" → 25）
// - birthdate があれば現在日付から年齢を算出し、age より優先
// - ytId が URL の場合は ID 抽出（https://youtu.be/ID, https://www.youtube.com/watch?v=ID）
// - 出力の並び順: name の五十音/アルファベット順

const fs = require("fs");
const path = require("path");

// ---------- 設定 ----------
const ROOT = process.cwd();
const PROFILES_DIR = path.join(ROOT, "profiles");
const OUTPUT = path.join(PROFILES_DIR, "index.json");

// ---------- ユーティリティ ----------
function readJSONSafe(file) {
  let txt = fs.readFileSync(file, "utf8");
  // BOM除去
  if (txt.charCodeAt(0) === 0xfeff) txt = txt.slice(1);
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
  } catch (e) {
    // URLでなければそのまま返す
  }
  return v;
}

function toNumberOrUndefined(x) {
  if (x === null || x === undefined || x === "") return undefined;
  const n = Number(x);
  return Number.isFinite(n) ? n : undefined;
}

function calcAgeFromBirthdate(birthdate, asOf = new Date()) {
  if (!birthdate) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthdate);
  if (!m) return undefined;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || !mo || !d) return undefined;

  // 日付だけで比較（時差の影響を受けにくくする）
  const today = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
  const bday = new Date(y, mo - 1, d);

  let age = today.getFullYear() - bday.getFullYear();
  const beforeBirthday =
    today.getMonth() < bday.getMonth() ||
    (today.getMonth() === bday.getMonth() && today.getDate() < bday.getDate());
  if (beforeBirthday) age--;

  return age;
}

// 一覧用に必要なフィールドだけ抽出 & バリデーション
function pickForList(data, fileBase) {
  const warnings = [];

  const slug = String((data.slug ?? fileBase)).toLowerCase();
  const name = data.name;
  const country = data.country;

  // ytId は単体 or videoIds[0] のどちらかから決定
  let ytId = data.ytId || (Array.isArray(data.videoIds) ? data.videoIds[0] : "");
  ytId = extractYouTubeId(ytId);

  // birthdate 優先で年齢算出（フォールバックとして age を使用）
  const birthdate = data.birthdate ?? undefined;
  if (birthdate && !/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) {
    warnings.push(`birthdate の形式が不正: ${birthdate}（YYYY-MM-DD で指定してください）`);
  }

  let age = toNumberOrUndefined(data.age);
  const ageFromBd = calcAgeFromBirthdate(birthdate);
  if (ageFromBd !== undefined) age = ageFromBd;

  const bestResult = data.bestResult ?? undefined;

  const obj = { slug, name, country, birthdate, age, bestResult, ytId };

  const missing = [];
  if (!slug) missing.push("slug");
  if (!name) missing.push("name");
  if (!country) missing.push("country");
  if (!ytId) missing.push("ytId");

  return { obj, missing, warnings };
}

// ---------- メイン ----------
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
  const warnings = [];

  for (const f of files) {
    const full = path.join(PROFILES_DIR, f);
    const base = path.basename(f, ".json");

    try {
      const data = readJSONSafe(full);
      const { obj, missing, warnings: ws } = pickForList(data, base);

      if (ws && ws.length) warnings.push(`⚠ ${f}: ${ws.join(" / ")}`);

      if (missing.length) {
        warnings.push(`⚠ ${f}: 必須キー不足 -> ${missing.join(", ")}`);
        continue;
      }
      list.push(obj);
    } catch (e) {
      warnings.push(`⚠ ${f}: JSON 解析エラー -> ${e.message}`);
    }
  }

  // name で安定ソート（日本語対応）
  list.sort((a, b) => String(a.name).localeCompare(String(b.name), "ja"));

  const out = { list };
  fs.writeFileSync(OUTPUT, JSON.stringify(out, null, 2) + "\n", "utf8");

  console.log(`✅ 生成完了: ${path.relative(ROOT, OUTPUT)} (${list.length}件)`);
  if (warnings.length) {
    console.log("── 警告 ──");
    for (const w of warnings) console.log(w);
  }
}

main();
