document.addEventListener('DOMContentLoaded', () => {
  /* ---------- 要素 ---------- */
  const $ = q => document.querySelector(q);
  const listEl     = $("#list");
  const listView   = $("#listView");
  const detailView = $("#detailView");
  const profileEl  = $("#profile");

  // toolbar
  const countrySel = $("#filterCountry");
  const ageMinEl   = $("#ageMin");
  const ageMaxEl   = $("#ageMax");
  const sortSel    = $("#sortBy");

  /* ---------- 状態 ---------- */
  let LIST = [];
  const PROFILE_CACHE = new Map();

  /* ---------- ユーティリティ ---------- */
  const slugify = s => (s||"").toLowerCase().replace(/[^a-z0-9\-]/g,'');
  const byNameAsc  = (a,b)=> a.name.localeCompare(b.name, 'ja', {sensitivity:'base'});
  const byNameDesc = (a,b)=> b.name.localeCompare(a.name, 'ja', {sensitivity:'base'});

  function thumbHTML(id, alt){
    const max = `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
    const hq  = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    return `<img class="thumb" src="${max}" onerror="this.onerror=null;this.src='${hq}'" alt="${alt}">`;
  }
  function iframe(id){
    return `<iframe src="https://www.youtube.com/embed/${id}" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  }

  /** 生年月日 → 年齢 */
  function calcAge(birthdate, asOf = new Date()){
    if (!birthdate) return undefined;
    const m = String(birthdate).trim().match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
    if (!m) return undefined;

    const y  = Number(m[1]);
    const mo = Number(m[2]);
    const d  = Number(m[3]);
    if (!y || !mo || !d) return undefined;

    const today = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
    const bday  = new Date(y, mo - 1, d);

    let age = today.getFullYear() - bday.getFullYear();
    const beforeBirthday =
      today.getMonth() < bday.getMonth() ||
      (today.getMonth() === bday.getMonth() && today.getDate() < d);
    if (beforeBirthday) age--;

    return Number.isFinite(age) ? age : undefined;
  }

  /* ---------- マニフェスト ---------- */
  async function loadManifest(){
    const res = await fetch('profiles/index.json', {cache:'no-store'});
    const json = await res.json();
    LIST = (json.list || []).map(row => ({ ...row, _age: calcAge(row.birthdate) }));
    buildToolbarOptions();
  }

  /* ---------- ツールバー初期化 ---------- */
  function buildToolbarOptions(){
    const countries = ["All", ...Array.from(new Set(LIST.map(v=>v.country)))];
    countrySel.innerHTML = countries.map(c=>`<option value="${c}">${c}</option>`).join("");

    const ages = LIST.map(v=>v._age).filter(a=>Number.isFinite(a));
    if(ages.length){
      ageMinEl.placeholder = String(Math.min(...ages));
      ageMaxEl.placeholder = String(Math.max(...ages));
    }
  }

  /* ---------- 詳細読み込み ---------- */
  async function loadProfile(slug){
    const key = slugify(slug);
    if (PROFILE_CACHE.has(key)) return PROFILE_CACHE.get(key);
    const res = await fetch(`profiles/${key}.json`, {cache:'no-store'});
    if(!res.ok) throw new Error('profile not found: '+key);
    const json = await res.json();
    PROFILE_CACHE.set(key, json);
    return json;
  }

  /* ---------- 一覧描画 ---------- */
  function cardHTML(p){
    const ageText = Number.isFinite(p._age) ? p._age : "-";
    return `
      <article class="card">
        <div onclick="playVideo('${p.ytId}', this)">${thumbHTML(p.ytId, p.name)}</div>
        <div class="pad">
          <div class="name">
            <a href="#p=${p.slug}" class="link-to-detail">${p.name}</a>（${p.country}）
          </div>
          <div class="stats">
            <div class="stat"><b>年齢：</b>${ageText}</div>
          </div>
        </div>
      </article>`;
  }

  function currentFilters(){
    const country = countrySel.value || "All";
    const min = parseInt(ageMinEl.value,10);
    const max = parseInt(ageMaxEl.value,10);
    const sort = sortSel.value || "name-asc";
    return {country, min: Number.isFinite(min)?min:undefined, max: Number.isFinite(max)?max:undefined, sort};
  }

  function applySort(arr, key){
    if(key==="name-desc") return arr.sort(byNameDesc);
    return arr.sort(byNameAsc);
  }

  function renderList(){
    const {country, min, max, sort} = currentFilters();
    let out = LIST.filter(p=>{
      if(country!=="All" && p.country!==country) return false;
      if(Number.isFinite(min) && !(Number.isFinite(p._age) && p._age>=min)) return false;
      if(Number.isFinite(max) && !(Number.isFinite(p._age) && p._age<=max)) return false;
      return true;
    });
    applySort(out, sort);
    listEl.innerHTML = out.map(cardHTML).join("");
  }

  function detailHTML(p){
    const age = calcAge(p.birthdate);
    const ageLine = Number.isFinite(age) ? `<div><span>年齢</span><strong>${age}</strong></div>` : "";
    const bdLine  = (p.birthdate && /\d/.test(p.birthdate)) ? `<div><span>生年月日</span><strong>${p.birthdate}</strong></div>` : "";
    const countryLine = p.country ? `<div><span>国籍</span><strong>${p.country}</strong></div>` : "";

    const s = p.socials || {};
    const snsItems = [
      s.youtube   ? `<a href="${s.youtube}"   class="sns yt"  target="_blank" rel="noopener">YouTube</a>`   : "",
      s.instagram ? `<a href="${s.instagram}" class="sns ig"  target="_blank" rel="noopener">Instagram</a>` : "",
      s.tiktok    ? `<a href="${s.tiktok}"    class="sns tk"  target="_blank" rel="noopener">TikTok</a>`    : "",
      s.x         ? `<a href="${s.x}"         class="sns x"   target="_blank" rel="noopener">X</a>`         : "",
      s.website   ? `<a href="${s.website}"   class="sns web" target="_blank" rel="noopener">Website</a>`   : ""
    ].filter(Boolean).join("");

    const snsBlock = snsItems
      ? `<section class="detail-section">
           <h3>SNS</h3>
           <div class="detail-sns">${snsItems}</div>
         </section>`
      : "";

    const videoBlock = p.ytId
      ? `<section class="detail-section">
           <h3>代表動画</h3>
           <div class="detail-videos">
             <div class="detail-video">${iframe(p.ytId)}</div>
           </div>
         </section>`
      : "";

    const basicsBlock = (countryLine || bdLine || ageLine)
      ? `<section class="detail-section">
           <h3>基本情報</h3>
           <div class="detail-basics">${countryLine}${bdLine}${ageLine}</div>
         </section>` : "";

    return `
      <header class="detail-head">
        <div class="detail-title">
          <h2>${p.name || ""}</h2>
        </div>
      </header>
      ${basicsBlock}
      ${snsBlock}
      ${videoBlock}
    `;
  }

  async function showDetailBySlug(slug){
    try{
      const p = await loadProfile(slug);
      profileEl.innerHTML = detailHTML(p);
      listView.hidden = true; detailView.hidden = false;
    }catch(e){
      console.error(e); showList();
    }
  }
  function showList(){ detailView.hidden = true; listView.hidden = false; }

  /* ---------- ルーティング ---------- */
  function routeFromHash(){
    const m = location.hash.match(/p=([a-z0-9\-]+)/i);
    if(m){ showDetailBySlug(m[1]); } else { showList(); }
  }
  window.addEventListener('hashchange', routeFromHash);

  /* ---------- イベント ---------- */
  window.playVideo = (id, el)=>{
    el.outerHTML = `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  };
  $("#backToList").addEventListener("click", ()=>{ history.pushState(null,"",location.pathname+location.search); routeFromHash(); });

  [countrySel, ageMinEl, ageMaxEl, sortSel].forEach(el=>{
    el.addEventListener('input', renderList);
    el.addEventListener('change', renderList);
  });

  /* ---------- 初期化 ---------- */
  (async ()=>{
    await loadManifest();
    renderList();
    routeFromHash();
  })();

});
