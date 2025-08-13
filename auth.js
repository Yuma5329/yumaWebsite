// === auth.js ===
// 1) 環境値（SupabaseのAPI › Project URL / anon public）
const SUPABASE_URL = "https://xxxxxxxxxxxx.supabase.co";   // ←あなたのURLに置換
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIs...";       // ←あなたのanon keyに置換

// 2) クライアント作成（UMDは window.supabase から）
window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 3) ちょいユーティリティ
function show(el){ el && (el.style.display = ""); }
function hide(el){ el && (el.style.display = "none"); }

function updateAuthUI(session){
  const emailSpan = document.getElementById('userEmail');
  const loginBtn  = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  if(session?.user){
    emailSpan.textContent = session.user.email || "(ログイン中)";
    hide(loginBtn);
    show(logoutBtn);
  }else{
    emailSpan.textContent = "";
    show(loginBtn);
    hide(logoutBtn);
  }
}

// 4) 起動時にセッションを反映
(async () => {
  const { data: { session } } = await window.sb.auth.getSession();
  updateAuthUI(session);
})();

// 5) 状態が変わったらUIを更新
window.sb.auth.onAuthStateChange((_event, session) => {
  updateAuthUI(session);
});

// 6) ログイン/ログアウトの動作
document.addEventListener('DOMContentLoaded', () => {
  const loginBtn  = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  loginBtn?.addEventListener('click', async () => {
    const email = prompt("ログイン用メールアドレスを入力してください（Magic Linkを送ります）:");
    if(!email) return;

    const { error } = await window.sb.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + window.location.pathname // 現在のページに戻す
      }
    });
    if(error){
      alert("送信に失敗しました: " + error.message);
    }else{
      alert("メールを送りました。届いたリンクからログインしてください。");
    }
  });

  logoutBtn?.addEventListener('click', async () => {
    await window.sb.auth.signOut();
  });
});