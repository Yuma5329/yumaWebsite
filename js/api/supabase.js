// js/api/supabase.js
// --- あなたのプロジェクト固有値 ---
export const SUPABASE_URL = "https://fzagbgiulecokykvidvv.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6YWdiZ2l1bGVjb2t5a3ZpZHZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNjQ2MzEsImV4cCI6MjA3MDY0MDYzMX0.v62G6RSGUg1lZ0SXIY2lzvAYhyIy2tS--1AGgtP1T4I";

// GitHub Pages の公開URL（auth.jsでも使いたければexport）
export const APP_URL = "https://yuma5329.github.io/yumaWebsite/";

// CDN(UMD)で読み込んだ window.supabase を使ってクライアント作成
export const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 既存コード互換（auth.jsなど）用にグローバルへも残す
window.sb = sb;
