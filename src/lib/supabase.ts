/// <reference types="vite/client" />
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, anonKey);

export const EDGE_URL = `${url}/functions/v1`;

export async function callEdgeFunction(
  fn: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  body?: unknown,
  queryId?: string
) {
  const { data: { session } } = await supabase.auth.getSession();
  const path = `${EDGE_URL}/${fn}${queryId ? `?id=${queryId}` : ""}`;
  const res = await fetch(path, {
    method,
    headers: {
      Authorization: `Bearer ${session!.access_token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Erro na operação");
  return json;
}
