import { api } from "./api";
import { setCookies } from "../utils/setCookies";

export const authService = {
  login: async (email: string, password: string) => {
    const res: any = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (!res.success) {
      return res;
    }
    await setCookies(res?.data?.token);

    return res;
  },

  // data may include avatar: File | null (optional). Uses multipart when a file is present.
  register: async (data: any) => {
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
      ]) {
        fd.append(key, data[key] ?? "");
      }
      fd.append("avatar", data.avatar);
      const res: any = await api("/api/auth/register", {
        method: "POST",
        body: fd,
      });
      if (!res.success) {
        return res;
      }

      return res;
    }
    const { avatar, ...rest } = data; // never send avatar:null in JSON
    return api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(rest),
    });
  },

  logout: () => api("/api/auth/logout", { method: "POST" }),
  me: () => api("/api/auth/me"),
};
