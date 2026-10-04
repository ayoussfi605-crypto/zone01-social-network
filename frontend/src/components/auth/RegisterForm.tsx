"use client";
import { useState } from "react";
import { authService } from "../../services/authService";
import { useRouter } from "next/navigation";

const inputCls =
  "w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#262626] outline-none transition focus:border-black";

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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function set(key: string, value: string) {
    setForm({ ...form, [key]: value });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!acceptedTerms) {
      setError("Please accept the Terms of Service to continue.");
      return;
    }
    setLoading(true);
    try {
      await authService.register({ ...form, email: form.email.trim(), avatar });
      router.push("/login");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-semibold text-[#111827]">
            First Name
          </label>
          <input
            placeholder="Jordan"
            value={form.first_name}
            onChange={(e) => set("first_name", e.target.value)}
            required
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-[#111827]">
            Last Name
          </label>
          <input
            placeholder="Carter"
            value={form.last_name}
            onChange={(e) => set("last_name", e.target.value)}
            required
            className={inputCls}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-[#111827]">
          Email Address
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
          <label className="mb-1 block text-sm font-semibold text-[#111827]">
            Password
          </label>
          <input
            placeholder="Min. 8 characters"
            type="password"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            required
            minLength={8}
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-[#111827]">
            Confirm Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            className={inputCls}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-[#111827]">
          Date of birth
        </label>
        <input
          type="date"
          value={form.dob}
          onChange={(event) => set("dob", event.target.value)}
          required
          className={inputCls}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-[#111827]">
          Nickname <span className="font-normal text-[#6B7280]">Optional</span>
          <input
            value={form.nickname}
            onChange={(event) => set("nickname", event.target.value)}
            placeholder="@yourname"
            className={`${inputCls} mt-1`}
          />
        </label>
        <label className="block text-sm font-semibold text-[#111827]">
          About Me <span className="font-normal text-[#6B7280]">Optional</span>
          <input
            value={form.about_me}
            onChange={(event) => set("about_me", event.target.value)}
            placeholder="A little about you"
            maxLength={280}
            className={`${inputCls} mt-1`}
          />
        </label>
      </div>
      <label className="block text-sm font-semibold text-[#111827]">
        Avatar / Image{" "}
        <span className="font-normal text-[#6B7280]">Optional</span>
        <input
          type="file"
          accept="image/*,.gif"
          onChange={(event) => setAvatar(event.target.files?.[0] ?? null)}
          className="mt-1 block w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#6B7280] file:mr-3 file:rounded-lg file:border-0 file:bg-[#E5E7EB] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#111827]"
        />
        {avatar && (
          <span className="mt-1 block truncate text-xs font-normal text-[#6B7280]">
            {avatar.name}
          </span>
        )}
      </label>
      <label className="flex items-start gap-2 text-xs leading-5 text-[#262626]">
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(event) => setAcceptedTerms(event.target.checked)}
          className="mt-1 accent-black"
        />
        <span>
          I agree to the{" "}
          <a
            href="mailto:hello@vibe.social?subject=Terms%20of%20Service"
            className="font-semibold underline underline-offset-2"
          >
            Terms of Service
          </a>
          .
        </span>
      </label>
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
        {loading ? "Creating account…" : "Create Account"}
      </button>
    </form>
  );
}
