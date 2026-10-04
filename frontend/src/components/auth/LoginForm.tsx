"use client";
import { useState } from "react";
import { authService } from "../../services/authService";
import { useRouter } from "next/navigation";

const inputCls =
  "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100";

// Reusable login form. Calls onSuccess after login.
export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const route = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res: any = await authService.login(email.trim(), password);

      if (!res.success) {
        //banner
        console.log(res.data.message);
      }
      route.push("/");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Email
        </label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          type="email"
          required
          className={inputCls}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Password
        </label>
        <div className="relative">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={showPw ? "text" : "password"}
            placeholder="••••••••"
            required
            className={inputCls + " pr-16"}
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            {showPw ? "Hide" : "Show"}
          </button>
        </div>
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
        {loading ? "Logging in..." : "Log in →"}
      </button>
    </form>
  );
}
