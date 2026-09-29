// Simple API helper. credentials:'include' sends session cookie automatically.
export const API_URL = "http://localhost:8080";

export async function api(path: string, options: RequestInit = {}) {
  // If body is FormData (file upload), let browser set Content-Type with boundary.
  const isForm = typeof FormData !== "undefined" && options.body instanceof FormData;
  const res = await fetch(API_URL + path, {
    credentials: "include",
    ...(isForm ? {} : { headers: { "Content-Type": "application/json" } }),
    ...options,
  });
  const text = await res.text();
  let data: any = text;
  try {
    data = JSON.parse(text);
  } catch {}
  if (!res.ok) throw new Error(typeof data === "string" ? data : JSON.stringify(data));
  return data;
}
