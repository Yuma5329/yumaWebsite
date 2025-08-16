// ===== script.js =====
document.addEventListener('DOMContentLoaded', () => {
  /* =========================
   *  要素参照（キャッシュ）
   * ========================= */
  const $ = (q) => document.querySelector(q);

  // Views
  const listEl     = $("#list");
  const listView   = $("#listView");
  const detailView = $("#detailView");
  const profileEl  = $("#profile");

  // Toolbar
  const qEl        = $("#q");
  const countrySel = $("#filterCountry");
  const ageMinEl   = $("#ageMin");
  const ageMaxEl   = $("#ageMax");
  const sortSel    = $("#sortBy");
  const favOnlyBtn = $("#favOnlyBtn");

  // Sidebar controls
  const body      = document.body;
  const sbToggle  = document.getElementById('sidebarToggle'); // サイドバー内ボタン
  const sbHandle  = document.getElementById('sidebarHandle'); // 折りたたみ時の取っ手

  /* =========================
   *  サイドバー開閉
   * ========================= */
  const setSidebarLabels = () => {
    const collapsed = body.classList.contains('sidebar-collapsed');
    if (sbToggle) {
      sbToggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      sbToggle.setAttribute('aria-label', collapsed ? 'サイドバーを開く' : 'サイドバーを閉じる');
      sbToggle.textContent = collapsed ? '→ ひらく' : '← 折りたたむ';
    }
    if (sbHandle) sbHandle.textContent = '→ ひらく';
  };

  // 前回状態を復元
  if (localStorage.getItem('sidebar-collapsed') === '1') {
    body.classList.add('sidebar-collapsed');
  }
  setSidebarLabels();

  const toggleSidebar = () => {
    const collapsed = body.classList.toggle('sidebar-collapsed');
    localStorage.setItem('sidebar-collapsed', collapsed ? '1' : '0');
    setSidebarLabels();
  };
  sbToggle?.addEventListener('click', toggleSidebar);
  sbHandle?.addEventListener('click', toggleSidebar);

  /* =========================
   *  状態
   * ========================= */
  let LIST = [];                         // 一覧データ
  const PROFILE_CACHE = new Map();       // 詳細キャッシュ
  let FAVORITES = new Set();             // お気に入り slug 集合
  let FAV_ONLY  = false;                 // お気に入りのみ表示フラグ

  /* =========================
   *  ユーティリティ
   * ========================= */
  const slugify   = (s) => (s || "").toLowerCase().replace(/[^a-z0-9\-]/g, '');
  const norm      = (s) => (s ?? "").toString().toLowerCase();
  const escapeHTML = (s = "") => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const byNameAsc  = (a, b) => a.name.localeCompare(b.name, 'ja', { sensitivity: 'base' });
  const byNameDesc = (a, b) => b.name.localeCompare(a.name, 'ja', { sensitivity: 'base' });
  const debounce   = (fn, ms = 120) => { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; };

  const thumbHTML = (id, alt) => {
    const max = `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
    const hq  = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    return `<img class="thumb" src="${max}" onerror="this.onerror=null;this.src='${hq}'" alt="${escapeHTML(alt)}">`;
  };

  const iframe = (id) =>
    `<iframe src="https://www.youtube.com/embed/${id}" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;

  // 生年月日 → 年齢
  function calcAge(birthdate, asOf = new Date()) {
    if (!birthdate) return undefined;
    const m = String(birthdate).trim().match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
    if (!m) return undefined;
    const [_, y, mo, d] = m.map(Number);
    if (!y || !mo || !d) return undefined;

    const today = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
    const bday  = new Date(y, mo - 1, d);
    let age = today.getFullYear() - bday.getFullYear();
    const beforeBirthday = today.getMonth() < bday.getMonth() ||
                           (today.getMonth() === bday.getMonth() && today.getDate() < d);
    if (beforeBirthday) age--;
    return Number.isFinite(age) ? age : undefined;
  }

  /* =========================
   *  Supabase お気に入り
   * ========================= */
  async function getCurrentUser() {
    if (!window.sb) return null;
    const { data: { user } } = await sb.auth.getUser();
    return user || null;
  }

  async function loadFavorites() {
    const user = await getCurrentUser();
    if (!user || !window.sb) {
      FAVORITES = new Set();
      updateFavOnlyUI();
      return;
    }
    const { data, error } = await sb
      .from('favorites')
      .select('slug')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    FAVORITES = (!error && Array.isArray(data)) ? new Set(data.map(r => r.slug)) : new Set();
    updateFavOnlyUI();
  }

  async function toggleFavorite(slug) {
    const user = await getCurrentUser();
    if (!user || !window.sb) { alert('お気に入りはログイン後に利用できます'); return; }

    if (FAVORITES.has(slug)) {
      const { error } = await sb.from('favorites').delete().eq('user_id', user.id).eq('slug', slug);
      if (!error) FAVORITES.delete(slug);
    } else {
      const { error } = await sb.from('favorites').insert({ user_id: user.id, slug });
      if (!error) FAVORITES.add(slug);
    }
    updateFavOnlyUI();
    renderList();
  }

  function updateFavOnlyUI() {
    if (!favOnlyBtn) return;
    favOnlyBtn.classList.toggle('active', FAV_ONLY);
    favOnlyBtn.textContent = (FAV_ONLY ? '★ ' : '☆ ') + 'お気に入りのみ';
    favOnlyBtn.disabled = (!FAVORITES.size && !FAV_ONLY);
  }

  /* =========================
   *  データ読み込み
   * ========================= */
  async function loadManifest() {
    const res = await fetch('profiles/index.json', { cache: 'no-store' });
    const json = await res.json();
    LIST = (json.list || []).map(row => ({ ...row, _age: calcAge(row.birthdate) }));
    buildToolbarOptions();
  }

  function buildToolbarOptions() {
    const countries = ["All", ...Array.from(new Set(LIST.map(v => v.country)))];
    countrySel.innerHTML = countries.map(c => `<option value="${c}">${c}</option>`).join("");

    const ages = LIST.map(v => v._age).filter(a => Number.isFinite(a));
    if (ages.length) {
      ageMinEl.placeholder = String(Math.min(...ages));
      ageMaxEl.placeholder = String(Math.max(...ages));
    }
  }

  async function loadProfile(slug) {
    const key = slugify(slug);
    if (PROFILE_CACHE.has(key)) return PROFILE_CACHE.get(key);
    const res = await fetch(`profiles/${key}.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error('profile not found: ' + key);
    const json = await res.json();
    PROFILE_CACHE.set(key, json);
    return json;
  }

  /* =========================
   *  一覧表示
   * ========================= */
  function cardHTML(p) {
    const ageText = Number.isFinite(p._age) ? p._age : "-";
    const favOn   = FAVORITES.has(p.slug);
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
          <div class="stats">
            <div class="stat"><b>年齢：</b>${ageText}</div>
          </div>
        </div>
      </article>`;
  }

  function currentFilters() {
    const country = countrySel.value || "All";
    const min = parseInt(ageMinEl.value, 10);
    const max = parseInt(ageMaxEl.value, 10);
    const sort = sortSel.value || "name-asc";
    const q = norm(qEl?.value || "");
    return {
      country,
      min: Number.isFinite(min) ? min : undefined,
      max: Number.isFinite(max) ? max : undefined,
      sort, q
    };
  }

  function applySort(arr, key) {
    if (key === "name-desc") return arr.sort(byNameDesc);
    return arr.sort(byNameAsc);
  }

  function renderList() {
    const { country, min, max, sort, q } = currentFilters();

    const out = LIST.filter(p => {
      if (q && !norm(p.name).includes(q)) return false;
      if (country !== "All" && p.country !== country) return false;
      if (Number.isFinite(min) && !(Number.isFinite(p._age) && p._age >= min)) return false;
      if (Number.isFinite(max) && !(Number.isFinite(p._age) && p._age <= max)) return false;
      if (FAV_ONLY && !FAVORITES.has(p.slug)) return false;
      return true;
    });

    applySort(out, sort);
    listEl.innerHTML = out.map(cardHTML).join("");
  }

  /* =========================
   *  詳細：動画セクション
   * ========================= */
  const videosSectionHTML = () => `
    <section class="detail-section">
      <h3>動画</h3>
      <div class="video-groups">
        <div class="video-group">
          <h4>個人チャンネル</h4>
          <div id="vb-personal" class="video-grid"></div>
        </div>
        <div class="video-group">
          <h4>Swissbeatbox</h4>
          <div id="vb-swiss" class="video-grid"></div>
        </div>
        <div class="video-group">
          <h4>その他</h4>
          <div id="vb-others" class="video-grid"></div>
        </div>
      </div>
    </section>`;

  function renderVideoBucket(bucketId, items) {
    const box = document.getElementById(bucketId);
    if (!box) return;

    if (!items || !items.length) {
      box.innerHTML = `<p class="meta">該当する動画が見つかりませんでした。</p>`;
      return;
    }

    box.innerHTML = items.map(v => {
      const vid   = (v.videoId || v.id || "").trim();
      const safe  = encodeURIComponent(vid);
      const title = escapeHTML(v.title || "");
      const thumb = v.thumbnail || `https://i.ytimg.com/vi/${safe}/hqdefault.jpg`;
      const date  = v.publishedAt ? new Date(v.publishedAt).toLocaleDateString('ja-JP') : "";
      const ch    = escapeHTML(v.channelTitle || "");
      return `
        <article class="v-card" data-vid="${safe}">
          <button type="button" class="v-thumb" aria-label="再生">
            <img src="${thumb}" alt="${title}">
            <span class="v-play">▶</span>
          </button>
          <div class="v-meta">
            <a class="v-title" href="https://www.youtube.com/watch?v=${safe}" target="_blank" rel="noopener noreferrer">${title}</a>
            <div class="v-date">${ch}${date ? ` ・ ${date}` : ""}</div>
          </div>
        </article>`;
    }).join("");
  }

  function setVideoLoading() {
    ["vb-personal", "vb-swiss", "vb-others"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = `<div class="video-loading">読み込み中…</div>`;
    });
  }

  async function loadVideosFor(p) {
    try {
      setVideoLoading();
      const body = { name: p.name, slug: p.slug, yt: p.socials?.youtube || null };
      const { data, error } = await sb.functions.invoke('yt-search', { body });
      if (error) throw error;
      renderVideoBucket('vb-personal', data.personal);
      renderVideoBucket('vb-swiss',   data.swissbeatbox);
      renderVideoBucket('vb-others',  data.others);
    } catch (e) {
      console.error(e);
      renderVideoBucket('vb-personal', []);
      renderVideoBucket('vb-swiss',   []);
      renderVideoBucket('vb-others',  []);
    }
  }

  /* =========================
   *  詳細ページ
   * ========================= */
  function detailHTML(p) {
    const age = calcAge(p.birthdate);
    const ageLine     = Number.isFinite(age) ? `<div><span>年齢</span><strong>${age}</strong></div>` : "";
    const bdLine      = (p.birthdate && /\d/.test(p.birthdate)) ? `<div><span>生年月日</span><strong>${escapeHTML(p.birthdate)}</strong></div>` : "";
    const countryLine = p.country ? `<div><span>国籍</span><strong>${escapeHTML(p.country)}</strong></div>` : "";

    const s = p.socials || {};
    const snsItems = [
      s.youtube   ? `<a href="${s.youtube}"   class="sns yt"  target="_blank" rel="noopener">YouTube</a>`   : "",
      s.instagram ? `<a href="${s.instagram}" class="sns ig"  target="_blank" rel="noopener">Instagram</a>` : "",
      s.tiktok    ? `<a href="${s.tiktok}"    class="sns tk"  target="_blank" rel="noopener">TikTok</a>`    : "",
      s.x         ? `<a href="${s.x}"         class="sns x"   target="_blank" rel="noopener">X</a>`         : "",
      s.website   ? `<a href="${s.website}"   class="sns web" target="_blank" rel="noopener">Website</a>`   : ""
    ].filter(Boolean).join("");

    const snsBlock = snsItems ? `
      <section class="detail-section">
        <h3>SNS</h3>
        <div class="detail-sns">${snsItems}</div>
      </section>` : "";

    const videoBlock = p.ytId ? `
      <section class="detail-section">
        <h3>代表動画</h3>
        <div class="detail-videos">
          <div class="detail-video">${iframe(p.ytId)}</div>
        </div>
      </section>` : "";

    const basicsBlock = (countryLine || bdLine || ageLine) ? `
      <section class="detail-section">
        <h3>基本情報</h3>
        <div class="detail-basics">${countryLine}${bdLine}${ageLine}</div>
      </section>` : "";

    return `
      <header class="detail-head">
        <div class="detail-title"><h2>${escapeHTML(p.name || "")}</h2></div>
      </header>
      ${basicsBlock}
      ${snsBlock}
      ${videoBlock}
      ${videosSectionHTML()}
    `;
  }

  async function showDetailBySlug(slug) {
    try {
      const p = await loadProfile(slug);
      profileEl.innerHTML = detailHTML(p);
      listView.hidden = true; detailView.hidden = false;
      loadVideosFor(p);
    } catch (e) {
      console.error(e); showList();
    }
  }
  const showList = () => { detailView.hidden = true; listView.hidden = false; };

  /* =========================
   *  ルーティング
   * ========================= */
  function routeFromHash() {
    const m = location.hash.match(/p=([a-z0-9\-]+)/i);
    if (m) { showDetailBySlug(m[1]); } else { showList(); }
  }
  window.addEventListener('hashchange', routeFromHash);

  /* =========================
   *  イベント
   * ========================= */
  // フィルタ
  if (qEl) {
    qEl.addEventListener('input', debounce(renderList, 120));
    qEl.addEventListener('change', renderList);
    qEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });
  }
  [countrySel, ageMinEl, ageMaxEl, sortSel].forEach(el => {
    el?.addEventListener('input', renderList);
    el?.addEventListener('change', renderList);
  });

  // 一覧カード：★トグル
  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.fav-btn');
    if (btn) toggleFavorite(btn.dataset.slug);
  });

  // お気に入りのみ
  favOnlyBtn?.addEventListener('click', async () => {
    if (!FAVORITES.size) {
      const user = await getCurrentUser();
      if (!user) { alert('ログインするとお気に入りが使えます'); return; }
    }
    FAV_ONLY = !FAV_ONLY;
    updateFavOnlyUI();
    renderList();
  });

  // 詳細ページ内：サムネ → その場再生
  profileEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.v-thumb');
    if (!btn) return;
    const card = btn.closest('.v-card');
    const vid  = card?.dataset.vid;
    if (!vid) return;
    btn.outerHTML = `
      <div class="v-embed">
        <iframe src="https://www.youtube.com/embed/${vid}?autoplay=1"
          allow="autoplay; encrypted-media" allowfullscreen></iframe>
      </div>`;
  });

  // 戻るボタン
  $("#backToList").addEventListener("click", () => {
    history.pushState(null, "", location.pathname + location.search);
    routeFromHash();
  });

  // 代表動画インライン再生（一覧カード）
  window.playVideo = (id, el) => {
    el.outerHTML = `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  };

  /* =========================
   *  初期化
   * ========================= */
  (async () => {
    await loadManifest();
    await loadFavorites();
    updateFavOnlyUI();
    renderList();
    routeFromHash();

    // 認証状態変化でお気に入り再取得
    if (window.sb && sb.auth?.onAuthStateChange) {
      sb.auth.onAuthStateChange(async () => {
        await loadFavorites();
        renderList();
      });
    }
  })();
});