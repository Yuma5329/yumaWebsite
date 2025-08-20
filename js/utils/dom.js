// DOMユーティリティ
export const $ = (q) => document.querySelector(q);

export const show = (el) => { if (!el) return; el.hidden = false; el.style.display = ""; };
export const hide = (el) => { if (!el) return; el.hidden = true; };

export const debounce = (fn, ms = 120) => {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
};
