import { $, debounce } from "./utils/dom.js";
import { byNameAsc, byNameDesc, escapeHTML } from "./utils/misc.js"; // （miscの他ユーティリティは各モジュールで読み込み）
import { initSidebar } from "./views/sidebar.js";
import { loadManifest, getList } from "./data/manifest.js";
import { loadFavorites, initFavorites } from "./data/favorites.js";
import { buildToolbarOptions, renderList, wireToolbar, wireFavButton } from "./views/list.js";
import { showDetailBySlug } from "./views/detail.js";
import { sb } from "./api/supabase.js";

document.addEventListener("DOMContentLoaded", async () => {
  // ---- 要素取得 ----
  const listEl     = $("#list");
  const listView   = $("#listView");
  const detailView = $("#detailView");
  const profileEl  = $("#profile");

  const ctrls = {
    qEl: $("#q"),
    countrySel: $("#filterCountry"),
    ageMinEl: $("#ageMin"),
    ageMaxEl: $("#ageMax"),
    sortSel: $("#sortBy")
  };
  const favOnlyBtn = $("#favOnlyBtn");

  // ---- サイドバー ----
  initSidebar(document.getElementById('sidebarToggle'), document.getElementById('sidebarHandle'));

  // ---- データ読み込み ----
  await loadManifest();
  buildToolbarOptions(getList(), ctrls);

  // ---- お気に入り ----
  const rerender = () => renderList(listEl, getList(), ctrls);
  initFavorites(favOnlyBtn, rerender);
  await loadFavorites(favOnlyBtn);

  // ---- イベント結線 ----
  wireToolbar(ctrls, rerender);
  wireFavButton(listEl, favOnlyBtn);

  // 代表動画インライン再生（一覧カード向けのグローバル関数）
  window.playVideo = (id, el) => {
    el.outerHTML = `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  };

  // 戻るボタン
  $("#backToList").addEventListener("click", () => {
    history.pushState(null, "", location.pathname + location.search);
    routeFromHash();
  });

  // ---- ルーティング ----
  function showList(){ detailView.hidden = true; listView.hidden = false; }
  async function routeFromHash(){
    const m = location.hash.match(/p=([a-z0-9\-]+)/i);
    if (m) { await showDetailBySlug(m[1], profileEl, listView, detailView); }
    else   { showList(); }
  }
  window.addEventListener('hashchange', routeFromHash);

  // ---- 初期描画 ----
  rerender();
  routeFromHash();

  // 認証状態変化でお気に入り再取得 → 再描画
  if (window.sb && sb.auth?.onAuthStateChange) {
    sb.auth.onAuthStateChange(async () => {
      await loadFavorites(favOnlyBtn);
      rerender();
    });
  }
});
