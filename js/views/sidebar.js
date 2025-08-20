// サイドバー開閉（ローカルストレージ復元つき）
export function initSidebar(sbToggle, sbHandle, body = document.body) {
  const setLabels = () => {
    const collapsed = body.classList.contains('sidebar-collapsed');
    if (sbToggle) {
      sbToggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      sbToggle.setAttribute('aria-label', collapsed ? 'サイドバーを開く' : 'サイドバーを閉じる');
      sbToggle.textContent = collapsed ? '→ ひらく' : '← 折りたたむ';
    }
    if (sbHandle) sbHandle.textContent = '→ ひらく';
  };

  if (localStorage.getItem('sidebar-collapsed') === '1') {
    body.classList.add('sidebar-collapsed');
  }
  setLabels();

  const toggle = () => {
    const collapsed = body.classList.toggle('sidebar-collapsed');
    localStorage.setItem('sidebar-collapsed', collapsed ? '1' : '0');
    setLabels();
  };

  sbToggle?.addEventListener('click', toggle);
  sbHandle?.addEventListener('click', toggle);
}
