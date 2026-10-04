"use client";
import { useState } from "react";
import { authService } from "../../services/authService";

const inputCls =
  "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100";

// Reusable register form. Calls onSuccess after register.
export default function RegisterForm() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    dob: "",
    nickname: "",
    about_me: "",
  });
  const [avatar, setAvatar] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(key: string, value: string) {
    setForm({ ...form, [key]: value });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authService.register({ ...form, email: form.email.trim(), avatar });
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            First name *
          </label>
          <input
            placeholder="Jane"
            value={form.first_name}
            onChange={(e) => set("first_name", e.target.value)}
            required
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Last name *
          </label>
          <input
            placeholder="Doe"
            value={form.last_name}
            onChange={(e) => set("last_name", e.target.value)}
            required
            className={inputCls}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Email *
        </label>
        <input
          placeholder="you@example.com"
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          required
          className={inputCls}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Password *
          </label>
          <input
            placeholder="min 6 chars"
            type="password"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            required
            minLength={6}
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Birth date *
          </label>
          <input
            type="date"
            value={form.dob}
            onChange={(e) => set("dob", e.target.value)}
            required
            className={inputCls}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Nickname{" "}
            <span className="font-normal normal-case text-zinc-400">
              (optional)
            </span>
          </label>
          <input
            placeholder="@jane"
            value={form.nickname}
            onChange={(e) => set("nickname", e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            About{" "}
            <span className="font-normal normal-case text-zinc-400">
              (optional)
            </span>
          </label>
          <input
            placeholder="Hi, I'm..."
            value={form.about_me}
            onChange={(e) => set("about_me", e.target.value)}
            className={inputCls}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Avatar{" "}
          <span className="font-normal normal-case text-zinc-400">
            (optional — jpg, png, gif)
          </span>
        </label>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-100 text-lg font-bold text-zinc-400">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={URL.createObjectURL(avatar)}
                alt="avatar preview"
                className="h-full w-full object-cover"
              />
            ) : (
              "🙂"
            )}
          </div>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.gif"
            onChange={(e) => setAvatar(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-zinc-500 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
          />
        </div>
        {avatar && (
          <p className="mt-1 text-xs text-zinc-400">
            {avatar.name} —{" "}
            <button
              type="button"
              onClick={() => setAvatar(null)}
              className="font-semibold text-red-500 hover:underline"
            >
              remove
            </button>
          </p>
        )}
      </div>
      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-black py-2.5 text-sm font-bold text-white transition disabled:bg-[#E5E7EB] disabled:text-[#6B7280]"
      >
        {loading ? "Creating account..." : "Create account →"}
      </button>
    </form>
  );
}
