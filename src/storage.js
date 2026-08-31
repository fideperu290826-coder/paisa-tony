import { supabase } from "./supabaseClient";

/* Config: una sola fila (id = 1) con todo el objeto de configuración en JSON */
export async function getConfig() {
  const { data, error } = await supabase
    .from("config")
    .select("data")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    console.error("getConfig error", error);
    return null;
  }
  return data ? data.data : null;
}

export async function setConfig(config) {
  const { error } = await supabase.from("config").upsert({ id: 1, data: config });
  if (error) {
    console.error("setConfig error", error);
    return false;
  }
  return true;
}

/* Participaciones: una fila por teléfono, guarda cuándo jugó y qué le tocó */
export async function getParticipation(phone) {
  const { data, error } = await supabase
    .from("participations")
    .select("data")
    .eq("phone", phone)
    .maybeSingle();
  if (error) {
    console.error("getParticipation error", error);
    return null;
  }
  return data ? data.data : null;
}

export async function setParticipation(phone, payload) {
  const { error } = await supabase.from("participations").upsert({ phone, data: payload });
  if (error) console.error("setParticipation error", error);
}

export async function deleteParticipation(phone) {
  const { error } = await supabase.from("participations").delete().eq("phone", phone);
  if (error) console.error("deleteParticipation error", error);
}

/* Historial: últimas 50 jugadas, para el panel admin */
export async function getHistory() {
  const { data, error } = await supabase
    .from("history")
    .select("data")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    console.error("getHistory error", error);
    return [];
  }
  return (data || []).map((row) => row.data);
}

/* Historial completo (hasta 2000 registros) para el dashboard de analíticas */
export async function getFullHistory() {
  const { data, error } = await supabase
    .from("history")
    .select("data")
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) {
    console.error("getFullHistory error", error);
    return [];
  }
  return (data || []).map((row) => row.data);
}

export async function addHistoryEntry(entry) {
  const { error } = await supabase.from("history").insert({ data: entry });
  if (error) console.error("addHistoryEntry error", error);
}
