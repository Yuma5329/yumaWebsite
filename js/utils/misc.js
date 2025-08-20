// 文字列ユーティリティ
export const slugify = (s) => (s || "").toLowerCase().replace(/[^a-z0-9\-]/g, "");
export const norm    = (s) => (s ?? "").toString().toLowerCase();
export const escapeHTML = (s = "") =>
  s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;'}[c]));

// 年齢計算
export function calcAge(birthdate, asOf = new Date()) {
  if (!birthdate) return undefined;
  const m = String(birthdate).trim().match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (!m) return undefined;
  const y  = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  if (!y || !mo || !d) return undefined;

  const today = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
  const bday  = new Date(y, mo - 1, d);
  let age = today.getFullYear() - bday.getFullYear();
  const before = today.getMonth() < bday.getMonth() ||
    (today.getMonth() === bday.getMonth() && today.getDate() < d);
  if (before) age--;
  return Number.isFinite(age) ? age : undefined;
}

// 並び替え
export const byNameAsc  = (a,b)=> a.name.localeCompare(b.name, 'ja', {sensitivity:'base'});
export const byNameDesc = (a,b)=> b.name.localeCompare(a.name, 'ja', {sensitivity:'base'});

// 動画サムネ / 埋め込み
export const thumbHTML = (id, alt) => {
  const max = `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
  const hq  = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  return `<img class="thumb" src="${max}" onerror="this.onerror=null;this.src='${hq}'" alt="${escapeHTML(alt)}">`;
};

export const iframe = (id) =>
  `<iframe src="https://www.youtube.com/embed/${id}" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
