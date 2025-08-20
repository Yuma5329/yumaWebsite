import { slugify, calcAge } from "../utils/misc.js";

let LIST = [];
const PROFILE_CACHE = new Map();

export async function loadManifest() {
  const res = await fetch('profiles/index.json', { cache: 'no-store' });
  const json = await res.json();
  LIST = (json.list || []).map(row => ({ ...row, _age: calcAge(row.birthdate) }));
  return LIST;
}
export function getList() { return LIST; }

export async function loadProfile(slug) {
  const key = slugify(slug);
  if (PROFILE_CACHE.has(key)) return PROFILE_CACHE.get(key);
  const res = await fetch(`profiles/${key}.json`, { cache: 'no-store' });
  if (!res.ok) throw new Error('profile not found: ' + key);
  const json = await res.json();
  PROFILE_CACHE.set(key, json);
  return json;
}
