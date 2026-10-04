"use client";
import { useState } from "react";
import { authService } from "../../services/authService";
import { useRouter } from "next/navigation";

const inputCls =
  "w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#262626] outline-none transition focus:border-black";

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
      await authService.login(email.trim(), password);
      route.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-semibold text-[#111827]">
          Email Address
        </label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          type="email"
          required
          className={inputCls}
        />
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-sm font-semibold text-[#111827]">
            Password
          </label>
          <a
            href="mailto:support@vibe.social?subject=Password%20reset"
            className="text-xs font-semibold text-[#6B7280] underline underline-offset-2"
          >
            Forgot Password?
          </a>
        </div>
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
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#6B7280]"
          >
            {showPw ? "Hide" : "Show"}
          </button>
        </div>
      </div>
      {error && (
        <p className="rounded-xl bg-[#F3F4F6] px-4 py-2.5 text-sm text-[#262626]">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-black py-3 text-sm font-bold text-white transition disabled:bg-[#E5E7EB] disabled:text-[#6B7280]"
      >
        {loading ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}
