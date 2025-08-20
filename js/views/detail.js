import { escapeHTML, iframe, calcAge } from "../utils/misc.js";
import { loadProfile } from "../data/manifest.js";

const videosSectionHTML = () => `
  <section class="detail-section">
    <h3>動画</h3>
    <div class="video-groups">
      <div class="video-group"><h4>個人チャンネル</h4><div id="vb-personal" class="video-grid"></div></div>
      <div class="video-group"><h4>Swissbeatbox</h4><div id="vb-swiss" class="video-grid"></div></div>
      <div class="video-group"><h4>その他</h4><div id="vb-others" class="video-grid"></div></div>
    </div>
  </section>`;

function renderVideoBucket(bucketId, items){
  const box = document.getElementById(bucketId);
  if (!box) return;
  if (!items || !items.length){
    box.innerHTML = `<p class="meta">該当する動画が見つかりませんでした。</p>`;
    return;
  }
  box.innerHTML = items.map(v=>{
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
function setVideoLoading(){
  ["vb-personal","vb-swiss","vb-others"].forEach(id=>{
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<div class="video-loading">読み込み中…</div>`;
  });
}

import { callFunction } from "../api/functions.js";

async function loadVideosFor(p){
 try{
   setVideoLoading();
   const payload = { name: p.name, slug: p.slug, yt: p.socials?.youtube || null };
   const data = await callFunction("yt-search", payload);
   renderVideoBucket('vb-personal', data.personal);
   renderVideoBucket('vb-swiss',   data.swissbeatbox);
   renderVideoBucket('vb-others',  data.others);
 }catch(e){
   console.error(e);
   renderVideoBucket('vb-personal', []);
   renderVideoBucket('vb-swiss',   []);
   renderVideoBucket('vb-others',  []);
 }
}

function detailHTML(p){
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
    <section class="detail-section"><h3>SNS</h3><div class="detail-sns">${snsItems}</div></section>` : "";

  const videoBlock = p.ytId ? `
    <section class="detail-section"><h3>代表動画</h3>
      <div class="detail-videos"><div class="detail-video">${iframe(p.ytId)}</div></div>
    </section>` : "";

  const basicsBlock = (countryLine || bdLine || ageLine) ? `
    <section class="detail-section"><h3>基本情報</h3>
      <div class="detail-basics">${countryLine}${bdLine}${ageLine}</div>
    </section>` : "";

  return `
    <header class="detail-head"><div class="detail-title"><h2>${escapeHTML(p.name || "")}</h2></div></header>
    ${basicsBlock}${snsBlock}${videoBlock}${videosSectionHTML()}
  `;
}

export async function showDetailBySlug(slug, profileEl, listView, detailView){
  try{
    const p = await loadProfile(slug);
    profileEl.innerHTML = detailHTML(p);
    listView.hidden = true; detailView.hidden = false;

    // その場再生（サムネを押したら埋め込みに）
    profileEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.v-thumb');
      if (!btn) return;
      const card = btn.closest('.v-card');
      const vid  = card?.dataset.vid;
      if (!vid) return;
      btn.outerHTML = `<div class="v-embed">
        <iframe src="https://www.youtube.com/embed/${vid}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>
      </div>`;
    }, { once:true });

    // 動画検索
    loadVideosFor(p);
  }catch(e){
    console.error(e);
    detailView.hidden = true; listView.hidden = false;
  }
}
