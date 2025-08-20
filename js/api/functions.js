// js/api/functions.js
import { sb } from "./supabase.js";

export async function callFunction(name, body) {
  const { data, error } = await sb.functions.invoke(name, { body });
  if (error) throw error;
  return data;
}
