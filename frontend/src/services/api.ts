"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_URL = "http://localhost:8080";

export async function api(path: string, options: RequestInit = {}) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;

  const isForm =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers = new Headers(options.headers);

  if (!isForm) {
    headers.set("Content-Type", "application/json");
  }

  if (sessionToken) {
    headers.set("Cookie", `session_token=${sessionToken}`);
  }

  const res = await fetch(API_URL + path, {
    ...options,
    headers,
  });

  const text = await res.text();

  let data: unknown = text;

  try {
    data = JSON.parse(text);
  } catch {}

  if (!res.ok) {
    throw new Error(typeof data === "string" ? data : JSON.stringify(data));
  }

  return data;
}

export async function GetSessionToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;

  if (!token) {
    redirect("/");
  }

  return token;
}
