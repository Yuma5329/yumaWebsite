// Supabase のお気に入り管理（UI用フラグも保持）
let FAVORITES = new Set();   // slug の集合
let FAV_ONLY  = false;       // “お気に入りのみ表示”
let onChange  = () => {};    // 変更時に呼ぶ（一覧再描画用）

function updateFavOnlyBtn(btn){
  if (!btn) return;
  btn.classList.toggle('active', FAV_ONLY);
  btn.textContent = (FAV_ONLY ? '★ ' : '☆ ') + 'お気に入りのみ';
  btn.disabled = (!FAVORITES.size && !FAV_ONLY);
}

export async function getCurrentUser(){
  if (!window.sb) return null;
  const { data: { user } } = await sb.auth.getUser();
  return user || null;
}

export async function loadFavorites(favOnlyBtn){
  const user = await getCurrentUser();
  if (!user || !window.sb) {
    FAVORITES = new Set();
    updateFavOnlyBtn(favOnlyBtn);
    return FAVORITES;
  }
  const { data, error } = await sb
    .from('favorites')
    .select('slug')
    .eq('user_id', user.id)
    .order('created_at', { ascending:false });

  FAVORITES = (!error && Array.isArray(data)) ? new Set(data.map(r=>r.slug)) : new Set();
  updateFavOnlyBtn(favOnlyBtn);
  return FAVORITES;
}

export async function toggleFavorite(slug, favOnlyBtn){
  const user = await getCurrentUser();
  if (!user || !window.sb) { alert('お気に入りはログイン後に利用できます'); return; }

  if (FAVORITES.has(slug)) {
    const { error } = await sb.from('favorites').delete().eq('user_id', user.id).eq('slug', slug);
    if (!error) FAVORITES.delete(slug);
  } else {
    const { error } = await sb.from('favorites').insert({ user_id: user.id, slug });
    if (!error) FAVORITES.add(slug);
  }
  updateFavOnlyBtn(favOnlyBtn);
  onChange();
}

export function initFavorites(favOnlyBtn, _onChange){
  onChange = _onChange || (()=>{});
  favOnlyBtn?.addEventListener('click', async ()=>{
    if (!FAVORITES.size) {
      const user = await getCurrentUser();
      if (!user) { alert('ログインするとお気に入りが使えます'); return; }
    }
    FAV_ONLY = !FAV_ONLY;
    updateFavOnlyBtn(favOnlyBtn);
    onChange();
  });
}

export function isFavorite(slug){ return FAVORITES.has(slug); }
export function getFavOnly(){ return FAV_ONLY; }
export function setFavOnly(v, favOnlyBtn){ FAV_ONLY = !!v; updateFavOnlyBtn(favOnlyBtn); onChange(); }
