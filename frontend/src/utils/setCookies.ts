"use server";

import { cookies } from "next/headers";

export async function setCookies(token: string) {
  const cookie = await cookies();
  cookie.set("session_token", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export async function clearSessionCookie() {
  const cookie = await cookies();
  cookie.delete("session_token");
}
