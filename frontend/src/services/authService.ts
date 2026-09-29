import { api } from "./api";

export const authService = {
  login: (email: string, password: string) =>
    api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  // data may include avatar: File | null (optional). Uses multipart when a file is present.
  register: (data: any) => {
    if (data.avatar instanceof File) {
      const fd = new FormData();
      for (const key of ["email", "password", "first_name", "last_name", "dob", "nickname", "about_me"]) {
        fd.append(key, data[key] ?? "");
      }
      fd.append("avatar", data.avatar);
      return api("/api/auth/register", { method: "POST", body: fd });
    }
    const { avatar, ...rest } = data; // never send avatar:null in JSON
    return api("/api/auth/register", { method: "POST", body: JSON.stringify(rest) });
  },

  logout: () => api("/api/auth/logout", { method: "POST" }),
  me: () => api("/api/auth/me"),
};
