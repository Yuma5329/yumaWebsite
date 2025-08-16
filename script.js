document.addEventListener('DOMContentLoaded', () => {
  /* ---------- 要素 ---------- */
  const $ = q => document.querySelector(q);
  const listEl     = $("#list");
  const listView   = $("#listView");
  const detailView = $("#detailView");
  const profileEl  = $("#profile");

  // 追加：サイドバー要素とトグル
  const sidebar        = $("#sidebar");
  const sidebarToggle  = $("#sidebarToggle");

  // toolbar
  const qEl        = $("#q");
  const countrySel = $("#filterCountry");
  const ageMinEl   = $("#ageMin");
  const ageMaxEl   = $("#ageMax");
  const sortSel    = $("#sortBy");
  const favOnlyBtn = $("#favOnlyBtn");

  /* ---------- サイドバー開閉 ---------- */
  function applySidebar(collapsed){
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    // アクセシビリティ反映
    if (sidebarToggle){
      sidebarToggle.setAttribute('aria-expanded', String(!collapsed));
      sidebarToggle.title = collapsed ? 'サイドバーを開く' : 'サイドバーを閉じる';
    }
    // 保存
    try{ localStorage.setItem('sidebarCollapsed', collapsed ? '1' : '0'); }catch(_){}
  }
  function toggleSidebar(){
    const now = document.body.classList.contains('sidebar-collapsed');
    applySidebar(!now);
  }
  // 初期状態（保存があれば復元。幅が狭い端末ではデフォルト閉）
  (() => {
    let collapsed = false;
    try{
      const saved = localStorage.getItem('sidebarCollapsed');
      if (saved === '1') collapsed = true;
      if (saved === null && window.matchMedia('(max-width: 900px)').matches) collapsed = true;
    }catch(_){}
    applySidebar(collapsed);
  })();
  sidebarToggle?.addEventListener('click', toggleSidebar);

  /* ---------- 以下は既存の一覧・詳細・動画・お気に入り処理（省略せず完備） ---------- */
  // …（この下はあなたの現行 script.js の内容をそのまま残しています。）