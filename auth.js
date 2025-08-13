// === auth.js ===
// 1) Supabase クライアント
const SUPABASE_URL = "https://fzagbgiulecokykvidvv.supabase.co";   // ←そのままでOK（自分のURL）
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6YWdiZ2l1bGVjb2t5a3ZpZHZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNjQ2MzEsImV4cCI6MjA3MDY0MDYzMX0.v62G6RSGUg1lZ0SXIY2lzvAYhyIy2tS--1AGgtP1T4I"; // ←そのままでOK（自分のanon key）
window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2) 便利関数
const $  = (q) => document.querySelector(q);
const $$ = (q) => document.querySelectorAll(q);
const show = (el) => { if (el) el.style.display = ""; };
const hide = (el) => { if (el) el.style.display = "none"; };
const text = (el, t="") => { if (el) el.textContent = t; };

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

// 4) モーダルの開閉
function openAuthModal(){
  $("#authMsg")?.replaceChildren(); // メッセージ消去
  $("#authForm")?.reset();
  show($("#loginModal"));
}
function closeAuthModal(){
  hide($("#loginModal"));
}
window.__closeAuthModal = closeAuthModal; // 他ファイルから閉じたい時用（任意）

// 5) 起動時にセッション反映
(async () => {
  const { data: { session } } = await sb.auth.getSession();
  updateAuthUI(session?.user || null);
})();

// 6) 状態変化を監視（ログイン/ログアウト）
sb.auth.onAuthStateChange((_event, session) => {
  updateAuthUI(session?.user || null);

  // 他のスクリプトに知らせたい場合のカスタムイベント
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
  const closeBtn  = $("#closeAuth");
  const emailEl   = $("#authEmail");
  const passEl    = $("#authPassword");

  // ヘッダー：ログインボタン → モーダルOpen
  loginBtn?.addEventListener("click", openAuthModal);

  // モーダル×ボタン
  closeBtn?.addEventListener("click", closeAuthModal);
  $("#loginModal")?.addEventListener("click", (e)=>{
    // 背景クリックで閉じる（中のカードクリックは除外）
    if (e.target.id === "loginModal") closeAuthModal();
  });

  // ログアウト
  logoutBtn?.addEventListener("click", async () => {
    try {
      await sb.auth.signOut();
      // onAuthStateChange でUIは更新される
    } catch (e) {
      alert("ログアウトに失敗しました: " + (e.message || e));
    }
  });

  // フォーム送信はデフォルトでは何もしない（ボタンで分岐）
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
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      text(msg, error.message);
      return;
    }
    closeAuthModal();
    // 必要ならここで「お気に入りの再取得」など実施
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
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) {
      text(msg, error.message);
      return;
    }
    // プロジェクト設定で「メール確認あり」の場合は確認メールが届きます
    text(msg, "登録メールを送信しました。メール内のリンクを開いてください。");
  });
});