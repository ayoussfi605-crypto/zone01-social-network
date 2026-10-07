import { api } from "./api";
import { clearSessionCookie, setCookies } from "../utils/setCookies";
import type { User } from "../types/user";

type APIResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

type RegisterData = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  dob: string;
  nickname?: string;
  about_me?: string;
  avatar?: File | null;
};

export const authService = {
  login: async (email: string, password: string) => {
    const res = (await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })) as APIResponse<{ user: User; token: string }>;

    if (!res.success) {
      return res;
    }
    await setCookies(res?.data?.token);

    return res;
  },

  // data may include avatar: File | null (optional). Uses multipart when a file is present.
  register: async (data: RegisterData) => {
    if (data.avatar instanceof File) {
      const fd = new FormData();
      for (const key of [
        "email",
        "password",
        "first_name",
        "last_name",
        "dob",
        "nickname",
        "about_me",
      ] as const) {
        fd.append(key, data[key] ?? "");
      }
      fd.append("avatar", data.avatar);
      const res = (await api("/api/auth/register", {
        method: "POST",
        body: fd,
      })) as APIResponse<User>;
      if (!res.success) {
        return res;
      }

      return res;
    }
    const rest = { ...data };
    delete rest.avatar;
    return api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(rest),
    }) as Promise<APIResponse<User>>;
  },

  logout: async () => {
    try {
      return (await api("/api/auth/logout", {
        method: "POST",
      })) as APIResponse<null>;
    } finally {
      await clearSessionCookie();
    }
  },
  me: () => api("/api/auth/me") as Promise<APIResponse<User>>,
};
