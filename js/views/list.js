import { debounce, $ } from "../utils/dom.js";
import { norm, escapeHTML, byNameAsc, byNameDesc, thumbHTML } from "../utils/misc.js";
import { isFavorite, getFavOnly, toggleFavorite } from "../data/favorites.js";

export function buildToolbarOptions(list, { countrySel, ageMinEl, ageMaxEl }){
  const countries = ["All", ...Array.from(new Set(list.map(v=>v.country)))];
  countrySel.innerHTML = countries.map(c=>`<option value="${c}">${c}</option>`).join("");

  const ages = list.map(v=>v._age).filter(a=>Number.isFinite(a));
  if (ages.length) {
    ageMinEl.placeholder = String(Math.min(...ages));
    ageMaxEl.placeholder = String(Math.max(...ages));
  }
}

function cardHTML(p){
  const ageText = Number.isFinite(p._age) ? p._age : "-";
  const favOn   = isFavorite(p.slug);
  const favLbl  = favOn ? "★" : "☆";
  const favCls  = favOn ? "fav-btn on" : "fav-btn";
  return `
    <article class="card">
      <button class="${favCls}" data-slug="${p.slug}" aria-label="お気に入り">${favLbl}</button>
      <div onclick="playVideo('${p.ytId}', this)">${thumbHTML(p.ytId, p.name)}</div>
      <div class="pad">
        <div class="name">
          <a href="#p=${p.slug}" class="link-to-detail">${escapeHTML(p.name)}</a>（${escapeHTML(p.country)}）
        </div>
        <div class="stats"><div class="stat"><b>年齢：</b>${ageText}</div></div>
      </div>
    </article>`;
}

function applySort(arr, key){
  if (key === "name-desc") return arr.sort(byNameDesc);
  return arr.sort(byNameAsc);
}

export function currentFilters({ countrySel, ageMinEl, ageMaxEl, sortSel, qEl }){
  const country = countrySel.value || "All";
  const min = parseInt(ageMinEl.value,10);
  const max = parseInt(ageMaxEl.value,10);
  const sort = sortSel.value || "name-asc";
  const q    = norm(qEl?.value || "");
  return {
    country,
    min: Number.isFinite(min) ? min : undefined,
    max: Number.isFinite(max) ? max : undefined,
    sort, q
  };
}

export function renderList(listEl, LIST, ctrls){
  const { country, min, max, sort, q } = currentFilters(ctrls);
  const out = LIST.filter(p=>{
    if (q && !norm(p.name).includes(q)) return false;
    if (country !== "All" && p.country !== country) return false;
    if (Number.isFinite(min) && !(Number.isFinite(p._age) && p._age >= min)) return false;
    if (Number.isFinite(max) && !(Number.isFinite(p._age) && p._age <= max)) return false;
    if (getFavOnly() && !isFavorite(p.slug)) return false;
    return true;
  });
  applySort(out, sort);
  listEl.innerHTML = out.map(cardHTML).join("");
}

export function wireToolbar(ctrls, onChange){
  const { qEl, countrySel, ageMinEl, ageMaxEl, sortSel } = ctrls;
  if (qEl) {
    qEl.addEventListener('input', debounce(onChange, 120));
    qEl.addEventListener('change', onChange);
    qEl.addEventListener('keydown', (e)=>{ if(e.key==='Enter') e.preventDefault(); });
  }
  [countrySel, ageMinEl, ageMaxEl, sortSel].forEach(el=>{
    el?.addEventListener('input', onChange);
    el?.addEventListener('change', onChange);
  });
}

export function wireFavButton(listEl, favOnlyBtn){
  listEl.addEventListener('click', (e)=>{
    const btn = e.target.closest('.fav-btn');
    if (btn) toggleFavorite(btn.dataset.slug, favOnlyBtn);
  });
}
