"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authService } from "../../../services/authService";
import PrivacyToggle from "../../../components/profile/PrivacyToggle";
import type { User } from "../../../types/user";

export default function FeedPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    authService
      .me()
      .then(setUser)
      .catch(() => router.push("/login"));
  }, []);

  async function logout() {
    await authService.logout();
    router.push("/login");
  }

  if (!user)
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-100">
        <p className="animate-pulse text-zinc-500">Loading your feed...</p>
      </main>
    );

  const initial = (
    user.first_name?.[0] ||
    user.email?.[0] ||
    "?"
  ).toUpperCase();

  return (
    <main className="min-h-screen bg-zinc-100">
      <nav className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 font-extrabold text-indigo-700"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-r from-indigo-600 to-violet-600 text-white">
              💬
            </span>
            Sphere
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-zinc-500 sm:block">
              {user.email}
            </span>
            <button
              onClick={logout}
              className="rounded-xl bg-zinc-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-zinc-700"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="h-24 bg-linear-to-r from-indigo-600 via-violet-600 to-fuchsia-500" />
          <div className="px-6 pb-6">
            <div className="-mt-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-2xl font-extrabold text-indigo-700 shadow-lg">
              {initial}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold">
                {user.first_name} {user.last_name}
              </h1>
              <span
                className={`rounded-full px-3 py-0.5 text-xs font-bold ${user.is_private ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}
              >
                {user.is_private ? "🔒 Private" : "🌍 Public"}
              </span>
            </div>
            <p className="text-sm text-zinc-500">
              {user.nickname ? `@${user.nickname} · ` : ""}
              {user.email}
              {user.about_me ? ` · ${user.about_me}` : ""}
            </p>
            <div className="mt-4">
              <PrivacyToggle user={user} onChange={setUser} />
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { href: "/groups", icon: "🏘️", t: "Groups", d: "Dev 4" },
            { href: "/chat", icon: "💬", t: "Chat", d: "Dev 4" },
            { href: "/profile", icon: "👤", t: "Profile", d: "Dev 2" },
          ].map((c) => (
            <Link
              key={c.t}
              href={c.href}
              className="rounded-3xl bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="text-2xl">{c.icon}</div>
              <div className="mt-1 font-bold">{c.t}</div>
              <div className="text-xs text-zinc-400">{c.d}</div>
            </Link>
          ))}
        </section>

        <section className="rounded-3xl border-2 border-dashed border-zinc-200 bg-white/60 p-10 text-center">
          <div className="text-4xl">📝</div>
          <h2 className="mt-2 font-bold">Your feed is ready</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500">
            Posts & comments engine lands with Dev 3. Your auth foundation
            already works — session persists on refresh.
          </p>
        </section>
      </div>
    </main>
  );
}
