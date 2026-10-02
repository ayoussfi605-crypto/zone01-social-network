"use server";

import { cookies } from "next/headers";

export async function checkSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;

  if (!token) {
    return false;
  }

  const response = await fetch(`http://localhost:8080/api/auth/me`, {
    method: "GET",
    headers: {
      Cookie: `session_token=${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return false;
  }

  return true;
}
