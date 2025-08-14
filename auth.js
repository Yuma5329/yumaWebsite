// === auth.js ===

// 1) Supabase クライアント
const SUPABASE_URL = "https://fzagbgiulecokykvidvv.supabase.co";   // ←あなたのProject URL
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6YWdiZ2l1bGVjb2t5a3ZpZHZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNjQ2MzEsImV4cCI6MjA3MDY0MDYzMX0.v62G6RSGUg1lZ0SXIY2lzvAYhyIy2tS--1AGgtP1T4I"; // ←あなたの anon key
window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const sb = window.sb;

// 公開サイトURL（GitHub Pagesの公開URLに合わせる）
const APP_URL = "https://yuma5329.github.io/yumaWebsite/";

// 2) 小ユーティリティ
const $  = (q) => document.querySelector(q);
const $$ = (q) => document.querySelectorAll(q);
function show(el){ if (!el) return; el.hidden = false; el.style.display = ""; }
function hide(el){ if (!el) return; el.hidden = true; }
function text(el, t=""){ if (el) el.textContent = t; }

// 3) ヘッダーのUIをログイン状態に合わせて更新
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

// 4) モーダルの開閉（#authBackdrop）
function openAuthModal(){
  const msg = $("#authMsg");
  msg?.replaceChildren();   // メッセージ消去
  $("#authForm")?.reset();
  show($("#authBackdrop"));
}
function closeAuthModal(){
  hide($("#authBackdrop"));
}

// 4.5) Supabaseリダイレクトのハッシュを処理してURLをクリーンに
async function handleAuthRedirect() {
  const hash = window.location.hash.slice(1);
  if (!hash) return;

  const qs = new URLSearchParams(hash);
  const hasAuthHash =
    qs.has("access_token") || qs.has("refresh_token") || qs.get("type");

  if (!hasAuthHash) return;

  // ハッシュ内トークンを取り込み
  await sb.auth.getSession();

  // アドレスバーからトークンを消す（ルーティング破壊を防止）
  window.history.replaceState(null, "", APP_URL);
}

// 5) 起動時にセッション反映
(async () => {
  await handleAuthRedirect();
  const { data: { session } } = await sb.auth.getSession();
  updateAuthUI(session?.user || null);
})();

// 6) 状態変化を監視（ログイン/ログアウト）
sb.auth.onAuthStateChange((_event, session) => {
  updateAuthUI(session?.user || null);

  // ログイン成功時はモーダルを確実に閉じて通知（任意）
  if (session?.user) {
    closeAuthModal();
    // window.alert("ログインしました"); // 必要なら
  }

  // 他のスクリプトに知らせたい場合（お気に入り再取得など）
  const ev = new CustomEvent("auth:state", { detail:{ user: session?.user || null } });
  window.dispatchEvent(ev);
});

// 7) DOMイベントのバインド
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

  // ヘッダー：ログインボタン → モーダルOpen
  loginBtn?.addEventListener("click", openAuthModal);

  // モーダル×ボタン
  closeBtn?.addEventListener("click", closeAuthModal);
  backdrop?.addEventListener("click", (e)=>{
    if (e.target.id === "authBackdrop") closeAuthModal(); // 背景クリックで閉じる
  });
  // Esc キーでも閉じる
  document.addEventListener("keydown", (e)=>{
    if (e.key === "Escape") closeAuthModal();
  });

  // ログアウト
  logoutBtn?.addEventListener("click", async () => {
    try {
      await sb.auth.signOut();
      // onAuthStateChange でUI更新
    } catch (e) {
      alert("ログアウトに失敗しました: " + (e.message || e));
    }
  });

  // フォームのデフォ送信は抑止（ボタンで分岐）
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
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      text(msg, error.message || "メールアドレスまたはパスワードが間違っています。");
      return;
    }
    text(msg, "ログインに成功しました！");
    closeAuthModal(); // 成功時は即閉じる
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
      options: {
        emailRedirectTo: APP_URL
      }
    });
    if (error) {
      text(msg, error.message || "登録に失敗しました。");
      return;
    }
    text(msg, "登録メールを送信しました。メール内のリンクを開いてください。");
  });
});