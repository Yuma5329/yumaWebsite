// === auth.js ===

// 1) Supabase クライアント
const SUPABASE_URL = "https://fzagbgiulecokykvidvv.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6YWdiZ2l1bGVjb2t5a3ZpZHZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNjQ2MzEsImV4cCI6MjA3MDY0MDYzMX0.v62G6RSGUg1lZ0SXIY2lzvAYhyIy2tS--1AGgtP1T4I";
window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const sb = window.sb;

// GitHub Pages の公開URL（ハッシュ消去用）
const APP_URL = "https://yuma5329.github.io/yumaWebsite/";

// 2) 小ユーティリティ
const $  = (q) => document.querySelector(q);
function show(el){ if (!el) return; el.hidden = false; el.style.display = ""; }
function hide(el){ if (!el) return; el.hidden = true; }
function text(el, t=""){ if (el) el.textContent = t; }

// 2.1) トースト通知
function showToast(message, ms=2400){
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=> el.classList.remove("show"), ms);
}

// 3) ヘッダーのUI更新
function updateAuthUI(user){
  const emailSpan = $("#userEmail");
  const loginBtn  = $("#loginBtn");
  const logoutBtn = $("#logoutBtn");
  if (user) {
    text(emailSpan, user.email || "(ログイン中)");
    hide(loginBtn); show(logoutBtn);
  } else {
    text(emailSpan, "");
    show(loginBtn); hide(logoutBtn);
  }
}

// 4) モーダル開閉（#authBackdrop）
function openAuthModal(){
  const msg = $("#authMsg");
  msg?.replaceChildren();
  $("#authForm")?.reset();
  show($("#authBackdrop"));
}
function closeAuthModal(){ hide($("#authBackdrop")); }

// 4.5) リダイレクトハッシュ処理
let justLoggedIn = false; // ログイン直後のトースト制御
let hadUser = null;       // 直前の「ログインしていたか」状態
async function handleAuthRedirect() {
  const hash = window.location.hash.slice(1);
  if (!hash) return;

  const qs = new URLSearchParams(hash);
  const hasAuthHash =
    qs.has("access_token") || qs.has("refresh_token") || qs.get("type");

  if (!hasAuthHash) return;

  // 取り込み
  await sb.auth.getSession();

  // リダイレクト由来＝ログイン完了とみなす
  justLoggedIn = true;

  // URLクリーンアップ（#token を消す）
  window.history.replaceState(null, "", APP_URL);
}

// 5) 起動時
(async () => {
  await handleAuthRedirect();
  const { data: { session} } = await sb.auth.getSession();
  updateAuthUI(session?.user || null);

  // 初期の状態を記録
  hadUser = !!session?.user;

  // リダイレクト経由ログイン完了時のトースト
  if (session?.user && justLoggedIn) {
    showToast("ログインしました");
    justLoggedIn = false;
  }
})();

// 6) 状態変化（ログイン/ログアウト）
sb.auth.onAuthStateChange((_event, session) => {
  updateAuthUI(session?.user || null);

  const nowHasUser = !!session?.user;

  // ログイン直後（フォーム／リダイレクト両方に対応）
  if (!hadUser && nowHasUser) {
    closeAuthModal();
    if (justLoggedIn) {
      showToast("ログインしました");
      justLoggedIn = false;
    }
  }

  // ログアウト直後は必ずトースト
  if (hadUser && !nowHasUser) {
    showToast("ログアウトしました");
  }

  hadUser = nowHasUser;

  // 他のスクリプトへ通知（必要に応じて）
  const ev = new CustomEvent("auth:state", { detail:{ user: session?.user || null } });
  window.dispatchEvent(ev);
});

// 7) DOMイベント
document.addEventListener("DOMContentLoaded", () => {
  const loginBtn  = $("#loginBtn");
  const logoutBtn = $("#logoutBtn");
  const authForm  = $("#authForm");
  const btnSignIn = $("#btnSignIn");
  const btnSignUp = $("#btnSignUp");
  const msg       = $("#authMsg");
  const closeBtn  = $("#authClose");
  const emailEl   = $("#authEmail");
  const passEl    = $("#authPassword");
  const backdrop  = $("#authBackdrop");

  loginBtn?.addEventListener("click", openAuthModal);

  closeBtn?.addEventListener("click", closeAuthModal);
  backdrop?.addEventListener("click", (e)=>{
    if (e.target.id === "authBackdrop") closeAuthModal();
  });
  document.addEventListener("keydown", (e)=>{
    if (e.key === "Escape") closeAuthModal();
  });

  // ログアウト（トーストは onAuthStateChange で出す）
  logoutBtn?.addEventListener("click", async () => {
    try {
      await sb.auth.signOut();
    } catch (e) {
      alert("ログアウトに失敗しました: " + (e.message || e));
    }
  });

  // フォーム送信はデフォルト送信を止める
  authForm?.addEventListener("submit", (e) => e.preventDefault());

  // ログイン（メール＋パスワード）
  btnSignIn?.addEventListener("click", async () => {
    msg.replaceChildren();
    const email = emailEl?.value?.trim();
    const password = passEl?.value ?? "";

    if (!email || !password) {
      text(msg, "メールとパスワードを入力してください。");
      return;
    }
    // onAuthStateChange で「ログインしました」を出すためフラグ
    justLoggedIn = true;
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      justLoggedIn = false; // 失敗なので解除
      text(msg, error.message || "メールアドレスまたはパスワードが間違っています。");
      return;
    }
    // 成功時は onAuthStateChange が走る（モーダル閉じ＆トースト表示）
  });

  // 新規登録（メール＋パスワード）
  btnSignUp?.addEventListener("click", async () => {
    msg.replaceChildren();
    const email = emailEl?.value?.trim();
    const password = passEl?.value ?? "";

    if (!email || !password) {
      text(msg, "メールとパスワードを入力してください。");
      return;
    }
    const { error } = await sb.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: APP_URL }
    });
    if (error) {
      text(msg, error.message || "登録に失敗しました。");
      return;
    }
    text(msg, "登録メールを送信しました。メール内のリンクを開いてください。");
  });
});
